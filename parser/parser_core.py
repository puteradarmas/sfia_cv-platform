"""
NLP Pipeline — Two-stage CV processing:
  Stage 1: JobBERT NER  →  skill entity extraction
  Stage 2: DistilBART-MNLI  →  SFIA v9 level estimation (zero-shot)
"""

from __future__ import annotations

import io
import logging
import re
from typing import Any

import pdfplumber
import pytesseract
from PIL import Image
from transformers import pipeline

from config import settings
from sfia_reference import SFIA_SKILLS, SFIA_LEVEL_HYPOTHESES

logger = logging.getLogger(__name__)


class CVProcessor:
    """Loads models once and processes CVs on demand."""

    def __init__(self):
        logger.info("Loading NER model: %s", settings.ner_model)
        self.ner = pipeline(
            "token-classification",
            model=settings.ner_model,
            aggregation_strategy="simple",
        )
        logger.info("Loading NLI model: %s", settings.nli_model)
        self.nli = pipeline(
            "zero-shot-classification",
            model=settings.nli_model,
        )
        logger.info("Both models loaded and ready.")

    # ── Public entry point ─────────────────────────────────────────
    def process(self, file_bytes: bytes, filename: str, content_type: str) -> dict[str, Any]:
        raw_text = self._extract_text(file_bytes, filename, content_type)
        candidate_info = self._extract_identity(raw_text)
        skills = self._extract_and_map_skills(raw_text)

        return {
            **candidate_info,
            "raw_text": raw_text,
            "skills": skills,
        }

    # ── Text extraction ────────────────────────────────────────────
    def _extract_text(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
            return self._extract_pdf(file_bytes)
        return self._extract_image(file_bytes)

    def _extract_pdf(self, file_bytes: bytes) -> str:
        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
                else:
                    # Fallback: render page as image and OCR
                    img = page.to_image(resolution=200).original
                    text_parts.append(pytesseract.image_to_string(img))
        return "\n".join(text_parts)

    def _extract_image(self, file_bytes: bytes) -> str:
        img = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(img)

    # ── Identity extraction (regex-based) ─────────────────────────
    def _extract_identity(self, text: str) -> dict:
        email_match = re.search(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}", text)
        phone_match = re.search(r"(\+?\d[\d\s\-().]{7,}\d)", text)

        # NER for person name — take first PER entity
        try:
            entities = self.ner(text[:512])
            names = [e["word"] for e in entities if e.get("entity_group", "").upper() == "PER"]
            full_name = names[0] if names else None
        except Exception:
            full_name = None

        return {
            "full_name": full_name,
            "email": email_match.group(0) if email_match else None,
            "phone": phone_match.group(0).strip() if phone_match else None,
        }

    # ── Skill extraction + SFIA mapping ───────────────────────────
    def _extract_and_map_skills(self, text: str) -> list[dict]:
        # Split into sentences for context windows
        sentences = [s.strip() for s in re.split(r"[.\n]", text) if len(s.strip()) > 15]

        # Run NER on chunks (BERT max 512 tokens)
        chunk_size = 400
        words = text.split()
        chunks = [" ".join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]

        raw_skills: set[str] = set()
        for chunk in chunks:
            try:
                entities = self.ner(chunk)
                for ent in entities:
                    if ent.get("entity_group", "").upper() == "SKILL" and len(ent["word"]) > 2:
                        raw_skills.add(ent["word"].strip())
            except Exception as e:
                logger.warning("NER chunk failed: %s", e)

        # Map each extracted skill to SFIA v9 + estimate level
        results = []
        for skill_word in list(raw_skills)[:15]:  # cap at 15 skills per CV
            sfia_entry = self._match_sfia_skill(skill_word)
            if not sfia_entry:
                continue

            context = self._find_context(skill_word, sentences)
            level, confidence = self._estimate_sfia_level(skill_word, context)

            results.append({
                "sfia_code":       sfia_entry["code"],
                "sfia_skill_name": sfia_entry["name"],
                "sfia_category":   sfia_entry.get("category"),
                "estimated_level": level,
                "confidence_score": confidence,
                "evidence":        context[:3],  # top 3 supporting sentences
            })

        return results

    def _match_sfia_skill(self, skill_word: str) -> dict | None:
        """Fuzzy match an extracted skill word to a SFIA v9 entry."""
        skill_lower = skill_word.lower()
        for entry in SFIA_SKILLS:
            keywords = [k.lower() for k in entry.get("keywords", [])]
            if skill_lower in keywords or skill_lower == entry["name"].lower():
                return entry
        return None

    def _find_context(self, skill: str, sentences: list[str]) -> list[str]:
        """Return sentences from the CV that mention this skill."""
        skill_lower = skill.lower()
        return [s for s in sentences if skill_lower in s.lower()][:5]

    def _estimate_sfia_level(self, skill: str, context_sentences: list[str]) -> tuple[int, float]:
        """Use zero-shot NLI to estimate SFIA level 1–7."""
        if not context_sentences:
            return 3, 0.40  # default: Level 3, low confidence

        premise = " ".join(context_sentences[:2])  # use up to 2 sentences
        hypotheses = [h.format(skill=skill) for h in SFIA_LEVEL_HYPOTHESES.values()]

        try:
            result = self.nli(premise, hypotheses, multi_label=False)
            top_idx = result["labels"].index(result["labels"][0])
            # labels come back in score order — map back to level
            score_map = {h: result["scores"][i] for i, h in enumerate(result["labels"])}
            best_label = result["labels"][0]
            level = list(SFIA_LEVEL_HYPOTHESES.values()).index(
                hypotheses[result["labels"].index(best_label)]
            ) + 1
            confidence = round(result["scores"][0], 2)
        except Exception as e:
            logger.warning("NLI inference failed for '%s': %s", skill, e)
            return 3, 0.40

        return max(1, min(7, level)), confidence
