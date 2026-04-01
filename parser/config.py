"""Application settings — loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://sfiauser:sfiapass@db:5432/sfiadb"
    app_env: str = "development"
    log_level: str = "info"

    # HuggingFace model IDs
    # With:
    # skill_model: str  = "jjzha/jobbert_skill_extraction"   # skill spans only
    # entity_model: str = "dslim/bert-base-NER"              # PER, ORG, LOC
    nli_model: str    = "valhalla/distilbart-mnli-12-3"    # SFIA level estimation
    
    # Single resume-specific NER model — handles Skills + identity
    resume_ner_model: str = "yashpwr/resume-ner-bert-v2"

    # File upload limits
    max_upload_bytes: int = 20 * 1024 * 1024  # 20 MB


settings = Settings()
