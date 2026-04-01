# ─────────────────────────────────────────────────────────────────
#  Parser API — Multi-stage Dockerfile
#  Targets: development (hot-reload) | production (optimised)
# ─────────────────────────────────────────────────────────────────

# ── Base: shared system dependencies ────────────────────────────
FROM python:3.11-slim AS base

WORKDIR /app

# System packages needed by pdfplumber, pytesseract, and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
      # pdfplumber / pdfminer
      libpoppler-cpp-dev \
      poppler-utils \
      # pytesseract (OCR fallback for image CVs)
      tesseract-ocr \
      tesseract-ocr-eng \
      # Health check curl
      curl \
      # psycopg2 native build deps (binary wheel avoids most of this)
      libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser


# ← FIX: create the cache directory as root, then hand ownership to appuser
#         BEFORE switching user — this ensures the volume mount point
#         is writable when Docker mounts the named volume over it
RUN mkdir -p /cache/huggingface && \
    chown -R appuser:appgroup /cache


# ── Deps: install Python packages ────────────────────────────────
FROM base AS deps

COPY requirements.txt .

# Install all deps to a dedicated prefix so we can copy cleanly
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Development target ────────────────────────────────────────────
FROM deps AS development

# Source is bind-mounted at runtime — no COPY needed
# uvicorn --reload watches /app for changes

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=development \
    HF_HOME=/cache/huggingface \
    TRANSFORMERS_CACHE=/cache/huggingface

USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--reload", \
     "--reload-dir", "/app", \
     "--log-level", "info"]

# ── Production target ─────────────────────────────────────────────
FROM deps AS production

# Copy application source into image (no bind mount in prod)
COPY --chown=appuser:appgroup . .

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    HF_HOME=/cache/huggingface \
    TRANSFORMERS_CACHE=/cache/huggingface

USER appuser

EXPOSE 8000

# Multiple workers for production throughput
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--log-level", "warning", \
     "--no-access-log"]
