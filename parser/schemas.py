"""Pydantic schemas for API request/response validation."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ── Health ──────────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    db: str
    models: str


# ── Parse response ───────────────────────────────────────────────
class ParseResponse(BaseModel):
    candidate_id: int
    profile_id: int
    full_name: Optional[str]
    email: Optional[str]
    skills_count: int
    status: str


# ── Skill record ─────────────────────────────────────────────────
class SkillRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    profile_id: int
    sfia_code: str
    sfia_skill_name: str
    sfia_category: Optional[str]
    estimated_level: int
    validated_level: Optional[int]
    confidence_score: float
    evidence_text: Optional[str]
    validation_status: str
    validator_note: Optional[str]


class SkillRecordPatch(BaseModel):
    validated_level: int
    validation_status: str          # CONFIRMED | CORRECTED | REJECTED
    validator_note: Optional[str] = None
    actor: Optional[str] = "reviewer"


# ── Profile ───────────────────────────────────────────────────────
class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidate_id: int
    status: str
    created_at: datetime
    validated_at: Optional[datetime]
    validated_by: Optional[str]
    skill_records: List[SkillRecordOut]


# ── Candidate ─────────────────────────────────────────────────────
class CandidateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    source_filename: Optional[str]
    uploaded_at: datetime
    profiles: List[ProfileOut] = []
