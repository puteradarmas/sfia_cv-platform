"""SQLAlchemy ORM models — mirrors the data architecture schema."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    DateTime, ForeignKey, Integer, Numeric, SmallInteger,
    String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id:              Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name:       Mapped[Optional[str]]  = mapped_column(String(255))
    email:           Mapped[Optional[str]]  = mapped_column(String(255))
    phone:           Mapped[Optional[str]]  = mapped_column(String(100))
    source_filename: Mapped[Optional[str]]  = mapped_column(String(255))
    uploaded_at:     Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())
    raw_cv_text:     Mapped[Optional[str]]  = mapped_column(Text)    # subject to 90-day retention

    profiles: Mapped[List[SkillsProfile]] = relationship("SkillsProfile", back_populates="candidate", cascade="all, delete-orphan")


class SkillsProfile(Base):
    __tablename__ = "skills_profiles"

    id:           Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int]            = mapped_column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    status:       Mapped[str]            = mapped_column(String(20), default="PENDING")  # PENDING | IN_REVIEW | VALIDATED | REJECTED
    created_at:   Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())
    validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    validated_by: Mapped[Optional[str]]  = mapped_column(String(255))

    candidate:     Mapped[Candidate]             = relationship("Candidate", back_populates="profiles")
    skill_records: Mapped[List[SFIASkillRecord]] = relationship("SFIASkillRecord", back_populates="profile", cascade="all, delete-orphan")


class SFIASkillRecord(Base):
    __tablename__ = "sfia_skill_records"

    id:                Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id:        Mapped[int]            = mapped_column(Integer, ForeignKey("skills_profiles.id", ondelete="CASCADE"), nullable=False)
    sfia_code:         Mapped[str]            = mapped_column(String(10), nullable=False)
    sfia_skill_name:   Mapped[str]            = mapped_column(String(255), nullable=False)
    sfia_category:     Mapped[Optional[str]]  = mapped_column(String(100))
    estimated_level:   Mapped[int]            = mapped_column(SmallInteger, nullable=False)
    validated_level:   Mapped[Optional[int]]  = mapped_column(SmallInteger)
    confidence_score:  Mapped[float]          = mapped_column(Numeric(4, 2), nullable=False)
    evidence_text:     Mapped[Optional[str]]  = mapped_column(Text)    # JSON array of CV sentences
    validation_status: Mapped[str]            = mapped_column(String(20), default="PENDING")  # PENDING | CONFIRMED | CORRECTED | REJECTED
    validator_note:    Mapped[Optional[str]]  = mapped_column(Text)

    profile: Mapped[SkillsProfile] = relationship("SkillsProfile", back_populates="skill_records")
    audit_entries: Mapped[List[AuditLog]] = relationship("AuditLog", back_populates="skill_record")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id:           Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    record_id:    Mapped[int]            = mapped_column(Integer, ForeignKey("sfia_skill_records.id"), nullable=False)
    event_type:   Mapped[str]            = mapped_column(String(50), nullable=False)
    before_state: Mapped[Optional[str]]  = mapped_column(Text)   # JSON snapshot
    after_state:  Mapped[str]            = mapped_column(Text)    # JSON snapshot
    actor:        Mapped[str]            = mapped_column(String(255), nullable=False)
    event_at:     Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())

    skill_record: Mapped[SFIASkillRecord] = relationship("SFIASkillRecord", back_populates="audit_entries")
