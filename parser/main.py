"""
SFIA Skills Intelligence Platform — Parser API
FastAPI application entry point.
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine, Base, get_db
from models import Candidate, SkillsProfile, SFIASkillRecord
from parser_core import CVProcessor
from schemas import (
    CandidateOut,
    ParseResponse,
    SkillRecordPatch,
    SkillRecordOut,
    ProfileOut,
    HealthResponse,
)

# ── Logging ────────────────────────────────────────────────────────
logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)


# ── Lifespan: warm up models on startup ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — initialising NLP pipeline...")
    Base.metadata.create_all(bind=engine)
    app.state.processor = CVProcessor()
    logger.info("NLP pipeline ready.")
    yield
    logger.info("Shutting down.")


# ── App ────────────────────────────────────────────────────────────
app = FastAPI(
    title="SFIA Skills Intelligence Platform — Parser API",
    version="1.0.0",
    description="CV ingestion, NLP skill extraction, SFIA v9 mapping, and validation workflow.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ─────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["System"])
def health():
    from sqlalchemy import text
    from database import engine as db_engine
    try:
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    models_ok = hasattr(app.state, "processor") and app.state.processor is not None

    return HealthResponse(
        status="ok" if (db_ok and models_ok) else "degraded",
        db="ok" if db_ok else "error",
        models="ok" if models_ok else "loading",
    )


# ── Parse (upload CV) ─────────────────────────────────────────────
@app.post("/parse", response_model=ParseResponse, status_code=status.HTTP_201_CREATED, tags=["CV Processing"])
async def parse_cv(file: UploadFile = File(...)):
    """
    Upload a CV (PDF or image). Returns a parsed candidate profile
    with AI-estimated SFIA skill records in PENDING status.
    """
    # Validate file type
    allowed = {"application/pdf", "image/jpeg", "image/png", "image/tiff"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. Accepted: PDF, JPEG, PNG, TIFF",
        )

    # Validate file size (20 MB limit)
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 20 MB limit.",
        )

    processor: CVProcessor = app.state.processor

    try:
        result = processor.process(
            file_bytes=content,
            filename=file.filename,
            content_type=file.content_type,
        )
    except Exception as exc:
        logger.exception("Processing failed: %s", exc)
        raise HTTPException(status_code=500, detail="CV processing failed. See server logs.")

    # Persist to database
    from sqlalchemy.orm import Session
    from database import SessionLocal

    db: Session = SessionLocal()
    try:
        candidate = Candidate(
            full_name=result["full_name"],
            email=result["email"],
            phone=result["phone"],
            source_filename=file.filename,
            raw_cv_text=result["raw_text"],
        )
        db.add(candidate)
        db.flush()

        profile = SkillsProfile(candidate_id=candidate.id, status="PENDING")
        db.add(profile)
        db.flush()

        skill_records = []
        for skill in result["skills"]:
            rec = SFIASkillRecord(
                profile_id=profile.id,
                sfia_code=skill["sfia_code"],
                sfia_skill_name=skill["sfia_skill_name"],
                sfia_category=skill.get("sfia_category"),
                estimated_level=skill["estimated_level"],
                confidence_score=skill["confidence_score"],
                evidence_text=json.dumps(skill.get("evidence", [])),
                validation_status="PENDING",
            )
            db.add(rec)
            skill_records.append(rec)

        db.commit()
        db.refresh(candidate)
        db.refresh(profile)

        return ParseResponse(
            candidate_id=candidate.id,
            profile_id=profile.id,
            full_name=candidate.full_name,
            email=candidate.email,
            skills_count=len(skill_records),
            status="PENDING",
        )
    except Exception as exc:
        db.rollback()
        logger.exception("Database write failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save results.")
    finally:
        db.close()


# ── Candidates ────────────────────────────────────────────────────
@app.get("/candidates", response_model=list[CandidateOut], tags=["Candidates"])
def list_candidates(status: str | None = None, skip: int = 0, limit: int = 50):
    from database import SessionLocal
    from sqlalchemy.orm import Session
    db: Session = SessionLocal()
    try:
        q = db.query(Candidate)
        if status:
            q = q.join(SkillsProfile).filter(SkillsProfile.status == status.upper())
        return q.order_by(Candidate.uploaded_at.desc()).offset(skip).limit(limit).all()
    finally:
        db.close()


@app.get("/candidates/{candidate_id}", response_model=CandidateOut, tags=["Candidates"])
def get_candidate(candidate_id: int):
    from database import SessionLocal
    db = SessionLocal()
    try:
        c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Candidate not found.")
        return c
    finally:
        db.close()


# ── Profiles & Skill Validation ───────────────────────────────────
@app.get("/profiles/{profile_id}", response_model=ProfileOut, tags=["Validation"])
def get_profile(profile_id: int):
    from database import SessionLocal
    db = SessionLocal()
    try:
        p = db.query(SkillsProfile).filter(SkillsProfile.id == profile_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Profile not found.")
        return p
    finally:
        db.close()


@app.patch("/profiles/{profile_id}/skills/{skill_id}", response_model=SkillRecordOut, tags=["Validation"])
def validate_skill(profile_id: int, skill_id: int, payload: SkillRecordPatch):
    """Confirm, correct, or reject a single SFIA skill record."""
    from database import SessionLocal
    from datetime import datetime, timezone
    db = SessionLocal()
    try:
        rec = db.query(SFIASkillRecord).filter(
            SFIASkillRecord.id == skill_id,
            SFIASkillRecord.profile_id == profile_id,
        ).first()
        if not rec:
            raise HTTPException(status_code=404, detail="Skill record not found.")

        before = {
            "validated_level": rec.validated_level,
            "validation_status": rec.validation_status,
            "validator_note": rec.validator_note,
        }

        rec.validated_level = payload.validated_level
        rec.validation_status = payload.validation_status
        rec.validator_note = payload.validator_note

        # Write audit log
        from models import AuditLog
        audit = AuditLog(
            record_id=rec.id,
            event_type="LEVEL_CORRECTED" if payload.validated_level != rec.estimated_level else "CONFIRMED",
            before_state=json.dumps(before),
            after_state=json.dumps(payload.model_dump()),
            actor=payload.actor or "reviewer",
            event_at=datetime.now(timezone.utc),
        )
        db.add(audit)
        db.commit()
        db.refresh(rec)
        return rec
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Skill update failed: %s", exc)
        raise HTTPException(status_code=500, detail="Update failed.")
    finally:
        db.close()


@app.post("/profiles/{profile_id}/approve", tags=["Validation"])
def approve_profile(profile_id: int, actor: str = "reviewer"):
    """Mark an entire profile as VALIDATED."""
    from database import SessionLocal
    from datetime import datetime, timezone
    db = SessionLocal()
    try:
        p = db.query(SkillsProfile).filter(SkillsProfile.id == profile_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Profile not found.")

        pending = [r for r in p.skill_records if r.validation_status == "PENDING"]
        if pending:
            raise HTTPException(
                status_code=400,
                detail=f"{len(pending)} skill records still PENDING. Review all before approving.",
            )

        p.status = "VALIDATED"
        p.validated_at = datetime.now(timezone.utc)
        p.validated_by = actor
        db.commit()
        return {"profile_id": profile_id, "status": "VALIDATED", "validated_by": actor}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Approval failed.")
    finally:
        db.close()


# ── Dashboard ─────────────────────────────────────────────────────
@app.get("/dashboard/skills", tags=["Dashboard"])
def skills_dashboard():
    """Aggregate skills stats across all VALIDATED profiles."""
    from database import SessionLocal
    from sqlalchemy import func
    db = SessionLocal()
    try:
        rows = (
            db.query(
                SFIASkillRecord.sfia_skill_name,
                SFIASkillRecord.sfia_code,
                func.count(SFIASkillRecord.id).label("count"),
                func.avg(SFIASkillRecord.validated_level).label("avg_level"),
            )
            .join(SkillsProfile)
            .filter(SkillsProfile.status == "VALIDATED")
            .filter(SFIASkillRecord.validation_status.in_(["CONFIRMED", "CORRECTED"]))
            .group_by(SFIASkillRecord.sfia_skill_name, SFIASkillRecord.sfia_code)
            .order_by(func.count(SFIASkillRecord.id).desc())
            .all()
        )
        return [
            {
                "sfia_skill_name": r.sfia_skill_name,
                "sfia_code": r.sfia_code,
                "count": r.count,
                "avg_validated_level": round(float(r.avg_level), 2) if r.avg_level else None,
            }
            for r in rows
        ]
    finally:
        db.close()
