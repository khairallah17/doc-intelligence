"""Application configuration loaded from environment variables / .env file."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All runtime configuration for the Document Intelligence API."""

    # --- Database ---
    DATABASE_URL: str

    # --- ChromaDB ---
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001

    # --- OpenAI ---
    OPENAI_API_KEY: str

    # --- Auth ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- File storage ---
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = ""
    USE_LOCAL_STORAGE: bool = True
    LOCAL_UPLOAD_DIR: str = "uploads"

    # --- Processing limits ---
    MAX_PDF_SIZE_MB: int = 20
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 100

    # --- AI models ---
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    LLM_MODEL: str = "gpt-4o"
    TOP_K_RESULTS: int = 4

    # --- CORS ---
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_min_length(cls, v: str) -> str:
        """Ensure the JWT secret key is at least 32 characters."""
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
