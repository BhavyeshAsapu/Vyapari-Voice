from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    gemini_api_key: str = ""  # Required for AI features; validated when used, not at startup
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "vyapari_voice"
    frontend_url: str = "http://localhost:5173"
    host: str = "0.0.0.0"
    port: int = 8000
    environment: str = "development"
    session_ttl_seconds: int = 300

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
