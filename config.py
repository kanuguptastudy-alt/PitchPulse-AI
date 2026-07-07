"""Configuration module for PitchPulse AI.

Provides environment settings loading via Pydantic Settings V2,
ensuring zero hardcoded secrets and robust schema validation.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings and secret manager for PitchPulse AI.

    Loads and validates all required configurations from environment variables.
    """

    # Gemini API Credentials (required for the translation and operational intelligence services)
    gemini_api_key: str = "placeholder_key_if_not_set"

    # Stadium configuration parameters for FIFA World Cup 2026 operations
    stadium_capacity: int = 80000
    environment: str = "production"
    rate_limit_calls: int = 100
    rate_limit_period_seconds: int = 60

    # Pydantic Settings V2 configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


# Instantiate the global settings object
settings = Settings()
