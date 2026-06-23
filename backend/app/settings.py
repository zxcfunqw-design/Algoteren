from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ALGOTEREN_", env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./algoteren.db"
    secret_key: str = "dev-secret-change-me"
    access_token_minutes: int = 60
    refresh_token_days: int = 30
    frontend_origin: str = "http://localhost:5173"
    seed_demo_data: bool = True
    judge_image: str = "gcc:13"
    judge_compile_timeout_seconds: int = 30
    judge_run_timeout_seconds: int = 4
    judge_memory_limit_mb: int = 256


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

