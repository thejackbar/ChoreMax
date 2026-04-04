from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_EXPIRY_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"
    NODE_ENV: Literal["development", "production", "test"] = "development"
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Calendar integration (optional)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    CALENDAR_ENCRYPTION_KEY: str = ""  # Fernet key for encrypting OAuth tokens

    # Admin CMS credentials
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def frontend_origins(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGIN.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.NODE_ENV == "production"


settings = Settings()
