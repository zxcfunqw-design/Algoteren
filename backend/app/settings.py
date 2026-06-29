from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ALGOTEREN_", env_file=("../.env", ".env"), extra="ignore")

    database_url: str = "postgresql+psycopg://postgres.fake:fake_password@fake.pooler.supabase.com:5432/postgres"
    secret_key: str = "fake_key"
    access_token_minutes: int = 60
    refresh_token_days: int = 30
    frontend_origin: str = "http://localhost:5173"
    seed_demo_data: bool = False
    auto_create_schema: bool = False
    cookie_secure: bool = True
    cookie_samesite: str = "lax"
    csrf_enabled: bool = True
    supabase_url: str = "https://fake.supabase.co"
    supabase_service_role_key: str = "fake_key"
    judge_image: str = "gcc:13"
    judge_compile_timeout_seconds: int = 30
    judge_run_timeout_seconds: int = 4
    judge_memory_limit_mb: int = 256
    judge_max_output_bytes: int = 16_384
    judge_workers: int = 2
    allow_local_judge: bool = False
    polygon_api_key: str = Field(default="fake_key", validation_alias="POLYGON_API_KEY")
    polygon_api_secret: str = Field(default="fake_key", validation_alias="POLYGON_API_SECRET")
    polygon_api_base_url: str = "https://polygon.codeforces.com/api/"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
