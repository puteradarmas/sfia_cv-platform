"""
NLP Pipeline — Three-stage CV processing:
  Stage 1a: dslim/bert-base-NER       → identity extraction (PER, ORG)
  Stage 1b: jjzha/jobbert_skill_extraction → skill span extraction
  Stage 2:  valhalla/distilbart-mnli-12-3  → SFIA v9 level estimation
"""

from __future__ import annotations

import io
import logging
import re
from typing import Any

import pdfplumber
import pytesseract
from PIL import Image
from transformers import pipeline,AutoTokenizer, AutoModelForTokenClassification

from config import settings
from sfia_reference import SFIA_SKILLS, SFIA_LEVEL_HYPOTHESES

logger = logging.getLogger(__name__)

def _build_ner_pipeline(model_id: str) -> Any:
    """
    Build a token-classification pipeline with a properly configured
    tokenizer — handles truncation at tokenizer level, not call level.
    """
    tokenizer = AutoTokenizer.from_pretrained(
        model_id,
        model_max_length=512,
    )
    model = AutoModelForTokenClassification.from_pretrained(model_id)
    return pipeline(
        "token-classification",
        model=model,
        tokenizer=tokenizer,
        aggregation_strategy="simple",
    )



class CVProcessor:
    """Loads models once and processes CVs on demand."""

    def __init__(self):


        logger.info("Loading entity NER model: %s", settings.entity_model)
        self.entity_ner = _build_ner_pipeline(settings.entity_model)

        logger.info("Loading skill extraction model: %s", settings.skill_model)
        self.skill_ner = _build_ner_pipeline(settings.skill_model)

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
        parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    parts.append(text)
                else:
                    img = page.to_image(resolution=200).original
                    parts.append(pytesseract.image_to_string(img))
        return "\n".join(parts)

    def _extract_image(self, file_bytes: bytes) -> str:
        return pytesseract.image_to_string(Image.open(io.BytesIO(file_bytes)))


    # ── Identity extraction (regex-based) ─────────────────────────
    def _extract_identity(self, text: str) -> dict:
        # Regex for email and phone — fast and reliable
        email = re.search(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}", text)
        phone = re.search(r"(\+?\d[\d\s\-().]{7,}\d)", text)

        # Use general NER (dslim/bert-base-NER) for person name
        # Run only on first 512 tokens worth of text (top of CV)
        full_name = None
        try:
            # Take first ~1500 characters — name is always near the top
            head = text[:1000]
            # Chunk to stay within token limit
            entities = self._run_ner(self.entity_ner, head)
            persons = [
                e["word"] for e in entities
                if e.get("entity_group", "").upper() == "PER"
                and len(e["word"].strip()) > 2
            ]
            print(persons)
            if persons:
                # Take the longest PER entity — most likely to be full name
                full_name = max(persons, key=len)
        except Exception as e:
            logger.warning("Identity NER failed: %s", e)

        return {
            "full_name": full_name,
            "email": email.group(0) if email else None,
            "phone": phone.group(0).strip() if phone else None,
        }

    # ── Skill extraction + SFIA mapping ───────────────────────────
    def _extract_and_map_skills(self, text: str) -> list[dict]:
        sentences = [
            s.strip() for s in re.split(r"[.\n]", text)
            if len(s.strip()) > 15
        ]

        # Safe word-based chunking — 300 words keeps well under 512 tokens
        words = text.split()
        chunks = [
            " ".join(words[i:i + 300])
            for i in range(0, len(words), 300)
        ]

        raw_skills: set[str] = set()
        for chunk in chunks:
            entities = self._run_ner(self.skill_ner, chunk)
            for ent in entities:
                label = ent.get("entity_group", "").upper()
                word  = ent.get("word", "").strip()
                # jobbert_skill_extraction outputs "SKILL" after aggregation
                if label == "SKILL" and len(word) > 2:
                    raw_skills.add(word)

        logger.info("Raw skill spans extracted: %s", raw_skills)

        # Map each skill span to SFIA + estimate level
        results = []
        seen_codes: set[str] = set()

        for skill_word in list(raw_skills)[:15]:
            sfia_entry = self._match_sfia_skill(skill_word)
            if not sfia_entry:
                continue
            # Avoid duplicate SFIA codes in one profile
            if sfia_entry["code"] in seen_codes:
                continue
            seen_codes.add(sfia_entry["code"])

            context = self._find_context(skill_word, sentences)
            level, confidence = self._estimate_sfia_level(skill_word, context)

            results.append({
                "sfia_code":        sfia_entry["code"],
                "sfia_skill_name":  sfia_entry["name"],
                "sfia_category":    sfia_entry.get("category"),
                "estimated_level":  level,
                "confidence_score": confidence,
                "evidence":         context[:3],
            })

        logger.info("Mapped %d SFIA skill records", len(results))
        return results
    
    # ── Safe chunked NER runner ────────────────────────────────────
    def _run_ner(self, ner_pipeline: Any, text: str) -> list[dict]:
        """
        Run NER on text, splitting into 300-word chunks automatically.
        Returns merged entity list. Logs and skips failed chunks.
        """
        words = text.split()
        chunks = [
            " ".join(words[i:i + 300])
            for i in range(0, len(words), 300)
        ]
        all_entities = []
        for chunk in chunks:
            if not chunk.strip():
                continue
            try:
                all_entities.extend(ner_pipeline(chunk))
            except Exception as e:
                logger.warning("NER chunk failed: %s", e)
        return all_entities


    # ── SFIA matching ──────────────────────────────────────────────
    def _match_sfia_skill(self, skill_word: str) -> dict | None:
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
