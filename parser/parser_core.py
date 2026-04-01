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

def _build_ner(model_id: str) -> Any:
    """
    Build a token-classification pipeline with truncation
    set at tokenizer level (the only way that works reliably).
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
        logger.info("Loading resume NER model: %s", settings.resume_ner_model)
        self.ner = _build_ner(settings.resume_ner_model)

        logger.info("Loading NLI model: %s", settings.nli_model)
        self.nli = pipeline(
            "zero-shot-classification",
            model=settings.nli_model,
        )
        logger.info("All models loaded.")

        # Print the model's actual label set at startup — useful for debugging
        id2label = self.ner.model.config.id2label
        labels = {v for v in id2label.values() if v != "O"}
        logger.info("NER model labels: %s", sorted(labels))

    # ── Public entry point ─────────────────────────────────────────
    def process(self, file_bytes: bytes, filename: str, content_type: str) -> dict[str, Any]:
        raw_text = self._extract_text(file_bytes, filename, content_type)
        entities  = self._run_ner_chunked(raw_text)

        # Log what the model actually found — critical for debugging
        found_labels = {e.get("entity_group", "") for e in entities}
        logger.info("Entity groups found: %s", found_labels)
        logger.info("Total entities: %d", len(entities))

        identity = self._extract_identity(entities, raw_text)
        skills   = self._extract_and_map_skills(entities, raw_text)

        return {**identity, "raw_text": raw_text, "skills": skills}

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
    def _run_ner_chunked(self, text: str) -> list[dict]:
        """
        Split text into 300-word chunks and run NER on each.
        300 words stays safely under 512 BERT tokens in all cases.
        """
        words  = text.split()
        chunks = [" ".join(words[i:i + 300]) for i in range(0, len(words), 300)]

        all_entities = []
        for chunk in chunks:
            if not chunk.strip():
                continue
            try:
                all_entities.extend(self.ner(chunk))
            except Exception as e:
                logger.warning("NER chunk failed: %s", e)

        # print(all_entities)
        return all_entities
    
    def _extract_identity(self, entities: list[dict], raw_text: str) -> dict:
        """
        Three-tier name extraction:
        1. NER model — best when name appears in context
        2. First-line heuristic — catches bare names at CV top
        3. Regex fallback — for structured formats like "Name: John Doe"
        Email and phone: NER + regex fallback (regex is more reliable here).
        """

        def norm_label(label: str) -> str:
            # Strip BIO prefix, uppercase, strip whitespace
            return label.replace("B-", "").replace("I-", "").strip().upper()

        # ── Tier 1: NER model ──────────────────────────────────────────
        name  = None
        email = None
        phone = None

        for ent in entities:
            label = norm_label(ent.get("entity_group", ""))
            word  = ent.get("word", "").strip()
            score = ent.get("score", 0)

            # Accept any of the common label variants across models
            if label in {"NAME", "PERSON", "PER"} and not name:
                if len(word) > 1 and score > 0.4:   # lower threshold for names
                    name = word

            elif label in {"EMAIL ADDRESS", "EMAIL", "EMAILS"} and not email:
                email = word

            elif label in {"PHONE NUMBER", "PHONE", "CONTACT"} and not phone:
                phone = word

        logger.info("After NER — name: %s | email: %s | phone: %s", name, email, phone)

        # ── Tier 2: First-line heuristic (catches bare names at CV top) ─
        if not name:
            lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
            if lines:
                first_line = lines[0]
                # A bare name at the top: 2-5 words, no digits, no special chars
                # not a section header, not an email, not a URL
                words_in_line = first_line.split()
                is_name_like = (
                    2 <= len(words_in_line) <= 5
                    and not re.search(r"[\d@:/\\]", first_line)
                    and not any(
                        kw in first_line.lower()
                        for kw in ["resume", "cv", "curriculum", "profile",
                                    "summary", "objective", "contact"]
                    )
                )
                if is_name_like:
                    name = first_line
                    logger.info("Name from first-line heuristic: %s", name)

        # ── Tier 3: Regex patterns ─────────────────────────────────────
        if not name:
            m = re.search(r"(?:name|nama)\s*[:\-]\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){1,4})",
                        raw_text, re.IGNORECASE)
            if m:
                name = m.group(1).strip()
                logger.info("Name from regex: %s", name)

        # ── Email — regex is more reliable than NER for this ──────────
        if not email:
            m = re.search(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}", raw_text)
            email = m.group(0) if m else None

        # ── Phone — regex fallback ─────────────────────────────────────
        if not phone:
            m = re.search(r"(\+?\d[\d\s\-().]{7,}\d)", raw_text)
            phone = m.group(0).strip() if m else None

        logger.info("Final identity — name: %s | email: %s | phone: %s",
                    name, email, phone)

        return {"full_name": name, "email": email, "phone": phone}
    # ── Skill extraction + SFIA mapping ───────────────────────────
    def _extract_and_map_skills(self, entities: list[dict], raw_text: str) -> list[dict]:
        """
        Filter SKILL entities from NER output, map each to SFIA v9,
        then estimate level using zero-shot NLI.
        """
        def norm(label: str) -> str:
            return label.replace("B-", "").replace("I-", "").upper()

        # Collect unique skill spans from NER
        # yashpwr/resume-ner-bert-v2 uses label "Skills"
        ner_skills: set[str] = set()
        for ent in entities:
            label = norm(ent.get("entity_group", ""))
            word  = ent.get("word", "").strip()
            score = ent.get("score", 0)
            if label in {"SKILLS", "SKILL"} and len(word) > 2 and score > 0.3:
                ner_skills.add(word.lower())

        logger.info("Track A — NER skill spans (%d): %s", len(ner_skills), ner_skills)

        text_lower = raw_text.lower()
        keyword_hits: set[str] = set() 

        for entry in SFIA_SKILLS:
            for kw in entry.get("keywords", []):
                kw_lower = kw.lower()
                # Use word-boundary matching to avoid "sql" matching "nosql"
                # for short keywords. For longer ones (4+ chars), simple substring ok.
                if len(kw_lower) <= 3:
                    # Require word boundary for short keywords like "R", "Go", "SQL"
                    if re.search(r"\b" + re.escape(kw_lower) + r"\b", text_lower):
                        keyword_hits.add(entry["code"])
                        break
                else:
                    if kw_lower in text_lower:
                        keyword_hits.add(entry["code"])
                        break

        logger.info("Track B — SFIA codes from keyword scan (%d): %s",
                len(keyword_hits), keyword_hits)

       # ── Merge: start with keyword hits, enrich with NER matches ────
        matched_codes: dict[str, dict] = {}   # code → sfia_entry

        # Add all keyword scanner hits
        for entry in SFIA_SKILLS:
            if entry["code"] in keyword_hits:
                matched_codes[entry["code"]] = entry

        # Add NER hits that match SFIA (using fuzzy match)
        for skill_word in ner_skills:
            entry = self._match_sfia_fuzzy(skill_word)
            if entry and entry["code"] not in matched_codes:
                matched_codes[entry["code"]] = entry

        logger.info("Total unique SFIA codes after merge: %d — %s",
                    len(matched_codes), list(matched_codes.keys()))

        # ── Build sentences for evidence + level estimation ────────────
        sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?\n])\s*", raw_text)
            if len(s.strip()) > 20
        ]

        # ── Estimate SFIA level for each matched skill ─────────────────
        results = []
        for code, entry in list(matched_codes.items())[:15]:   # cap at 15
            context       = self._find_context_multi(entry, sentences)
            level, conf   = self._estimate_level(entry["name"], context)

            results.append({
                "sfia_code":        entry["code"],
                "sfia_skill_name":  entry["name"],
                "sfia_category":    entry.get("category"),
                "estimated_level":  level,
                "confidence_score": conf,
                "evidence":         context[:3],
            })

        logger.info("Final: %d SFIA skill records built", len(results))
        return results


    def _match_sfia_fuzzy(self, skill_word: str) -> dict | None:
        """Fuzzy match an NER-extracted span to a SFIA entry."""
        skill_lower = skill_word.lower()
        best_entry  = None
        best_score  = 0

        for entry in SFIA_SKILLS:
            keywords = [k.lower() for k in entry.get("keywords", [])]

            if skill_lower == entry["name"].lower() or skill_lower in keywords:
                return entry

            score = 0
            for kw in keywords:
                if len(kw) >= 4 and kw in skill_lower:
                    score = max(score, len(kw))
                if len(skill_lower) >= 4 and skill_lower in kw:
                    score = max(score, len(skill_lower) - 1)

            if score > best_score:
                best_score = score
                best_entry = entry

        return best_entry if best_score >= 4 else None


    def _find_context_multi(self, entry: dict, sentences: list[str]) -> list[str]:
        """
        Find sentences relevant to a SFIA entry using any of its keywords.
        Better than single-keyword lookup — catches more evidence from experience.
        """
        keywords = [k.lower() for k in entry.get("keywords", [])]
        matches  = []
        for s in sentences:
            s_lower = s.lower()
            if any(kw in s_lower for kw in keywords):
                matches.append(s)
            if len(matches) >= 5:
                break
        return matches
    
    # # ── Safe chunked NER runner ────────────────────────────────────
    # def _run_ner(self, ner_pipeline: Any, text: str) -> list[dict]:
    #     """
    #     Run NER on text, splitting into 300-word chunks automatically.
    #     Returns merged entity list. Logs and skips failed chunks.
    #     """
    #     words = text.split()
    #     chunks = [
    #         " ".join(words[i:i + 300])
    #         for i in range(0, len(words), 300)
    #     ]
    #     all_entities = []
    #     for chunk in chunks:
    #         if not chunk.strip():
    #             continue
    #         try:
    #             all_entities.extend(ner_pipeline(chunk))
    #         except Exception as e:
    #             logger.warning("NER chunk failed: %s", e)
    #     return all_entities


    # ── SFIA matching ──────────────────────────────────────────────
    def _match_sfia(self, skill_word: str) -> dict | None:
        skill_lower = skill_word.lower()
        best_entry  = None
        best_score  = 0

        for entry in SFIA_SKILLS:
            keywords = [k.lower() for k in entry.get("keywords", [])]

            # Exact match — return immediately
            if skill_lower == entry["name"].lower() or skill_lower in keywords:
                return entry

            score = 0

            # Skill span contains a keyword ("apache spark" → "spark")
            for kw in keywords:
                if len(kw) >= 4 and kw in skill_lower:
                    score = max(score, len(kw))

            # Keyword contains skill span ("python" → "python programming")
            for kw in keywords:
                if len(skill_lower) >= 4 and skill_lower in kw:
                    score = max(score, len(skill_lower) - 1)

            if score > best_score:
                best_score = score
                best_entry = entry

        return best_entry if best_score >= 4 else None

    def _find_context(self, skill: str, sentences: list[str]) -> list[str]:
        sl = skill.lower()
        return [s for s in sentences if sl in s.lower()][:5]
    
    def _estimate_level(self, skill: str, context: list[str]) -> tuple[int, float]:
        if not context:
            return 3, 0.40

        premise    = " ".join(context[:2])
        hypotheses = [h.format(skill=skill) for h in SFIA_LEVEL_HYPOTHESES.values()]

        try:
            result = self.nli(
                premise,
                hypotheses,
                multi_label=False,
                truncation=True,
                max_length=512,
            )
            level = hypotheses.index(result["labels"][0]) + 1
            conf  = round(result["scores"][0], 2)
        except Exception as e:
            logger.warning("NLI failed for '%s': %s", skill, e)
            return 3, 0.40

        return max(1, min(7, level)), conf
