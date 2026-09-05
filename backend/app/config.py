import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "MandateSentinel"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./mandatesentinel.db")

    # Redis
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", None)

    # Razorpay (Test Mode)
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_mandate_sentinel_mock")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "mock_secret_key_12345")
    RAZORPAY_MOCK_MODE: bool = os.getenv("RAZORPAY_MOCK_MODE", "true").lower() in ("true", "1", "yes")

    # Anthropic / Claude API (for reason generation & semantic judge fallback)
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY", None)

    # Risk Engine Thresholds (Tuned on training split)
    T_STEPUP: float = float(os.getenv("T_STEPUP", "0.45"))
    T_BLOCK: float = float(os.getenv("T_BLOCK", "0.70"))

    # Feature Weights: w1*(1-semantic) + w2*iforest + w3*velocity + w4*spend_overage
    WEIGHT_SEMANTIC: float = float(os.getenv("WEIGHT_SEMANTIC", "0.40"))
    WEIGHT_ANOMALY: float = float(os.getenv("WEIGHT_ANOMALY", "0.25"))
    WEIGHT_VELOCITY: float = float(os.getenv("WEIGHT_VELOCITY", "0.15"))
    WEIGHT_SPEND: float = float(os.getenv("WEIGHT_SPEND", "0.20"))

    # Synthetic Dataset Size
    SYNTHETIC_REQUEST_COUNT: int = int(os.getenv("SYNTHETIC_REQUEST_COUNT", "1000"))
    SYNTHETIC_SESSION_COUNT: int = int(os.getenv("SYNTHETIC_SESSION_COUNT", "120"))

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
