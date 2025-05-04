# backend/app/config.py
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, Field

class Settings(BaseSettings):
    # load from backend/.env and ignore any extras like S3_BUCKET
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parents[1] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: PostgresDsn       = Field(..., env="DATABASE_URL")
    secret_key: str                  = Field(..., env="SECRET_KEY")
    access_token_expire_minutes: int = Field(15,   env="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int   = Field(7,    env="REFRESH_TOKEN_EXPIRE_DAYS")
    aws_access_key_id: str           = Field(..., env="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str       = Field(..., env="AWS_SECRET_ACCESS_KEY")
    aws_region: str                  = Field("us-west-2", env="AWS_REGION")
    s3_bucket: str                   = Field(..., env="S3_BUCKET")

settings = Settings()