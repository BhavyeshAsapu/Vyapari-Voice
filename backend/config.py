import logging
from pydantic_settings import BaseSettings
from pydantic import field_validator

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    gemini_api_key: str = ""  # Required for AI features; validated when used, not at startup
    gemini_model: str = "gemini-3.5-flash"  # Configurable via GEMINI_MODEL env var
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "vyapari_voice"
    frontend_url: str = "http://localhost:5173"
    host: str = "0.0.0.0"
    port: int = 8000
    environment: str = "development"
    session_ttl_seconds: int = 300
    expiry_soon_days: int = 3  # Products expiring within N days trigger EXPIRING_SOON

    @field_validator("gemini_api_key", mode="before")
    @classmethod
    def sanitize_api_key(cls, v: str) -> str:
        """Strip accidental whitespace, newlines, and surrounding quotes."""
        if not v:
            return ""
        cleaned = str(v).strip().strip("\"'")
        return cleaned

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# Log key presence/length — NEVER the actual key value
_key_configured = bool(settings.gemini_api_key)
_key_length = len(settings.gemini_api_key) if settings.gemini_api_key else 0
logger.info(f"GEMINI_API_KEY configured: {_key_configured}")
logger.info(f"GEMINI_API_KEY length: {_key_length}")
logger.info(f"GEMINI_MODEL: {settings.gemini_model}")

