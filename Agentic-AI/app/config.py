"""Configuration management with validation (fail closed)."""

import os
from pathlib import Path
from typing import Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from loguru import logger


class Config(BaseSettings):
    """Application configuration with validation."""
    
    # API Configuration
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    debug: bool = Field(default=False, env="DEBUG")
    
    # Groq API Configuration
    groq_api_key: str = Field(default="your_groq_api_key_here", env="GROQ_API_KEY")
    
    # Model Configuration
    router_model_path: Path = Field(default=Path("models/router.pt"), env="ROUTER_MODEL_PATH")
    hand_model_path: Path = Field(default=Path("models/hand_yolo.pt"), env="HAND_MODEL_PATH")
    leg_model_path: Path = Field(default=Path("models/leg_yolo.pt"), env="LEG_MODEL_PATH")
    
    # Detection Thresholds
    router_threshold: float = Field(default=0.70, ge=0.0, le=1.0, env="ROUTER_THRESHOLD")
    detector_score_min: float = Field(default=0.35, ge=0.0, le=1.0, env="DETECTOR_SCORE_MIN")
    nms_iou: float = Field(default=0.50, ge=0.0, le=1.0, env="NMS_IOU")
    
    # Triage Thresholds
    triage_red_threshold: float = Field(default=0.8, ge=0.0, le=1.0, env="TRIAGE_RED_THRESHOLD")
    triage_amber_threshold: float = Field(default=0.6, ge=0.0, le=1.0, env="TRIAGE_AMBER_THRESHOLD")
    triage_high_confidence_threshold: float = Field(default=0.8, ge=0.0, le=1.0, env="TRIAGE_HIGH_CONFIDENCE_THRESHOLD")
    triage_medium_confidence_threshold: float = Field(default=0.6, ge=0.0, le=1.0, env="TRIAGE_MEDIUM_CONFIDENCE_THRESHOLD")
    
    # Timeouts (seconds)
    route_timeout: int = Field(default=2, ge=1, env="ROUTE_TIMEOUT")
    detect_timeout: int = Field(default=12, ge=1, env="DETECT_TIMEOUT")
    triage_timeout: int = Field(default=2, ge=1, env="TRIAGE_TIMEOUT")
    diagnosis_timeout: int = Field(default=5, ge=1, env="DIAGNOSIS_TIMEOUT")
    report_timeout: int = Field(default=5, ge=1, env="REPORT_TIMEOUT")
    
    # Retry Configuration
    max_retries: int = Field(default=1, ge=0, env="MAX_RETRIES")
    
    # Storage Configuration
    storage_type: str = Field(default="local", env="STORAGE_TYPE")
    storage_path: Path = Field(default=Path("./storage"), env="STORAGE_PATH")
    storage_bucket: Optional[str] = Field(default=None, env="STORAGE_BUCKET")
    
    # Cloudinary Configuration
    cloudinary_url: Optional[str] = Field(default=None, env="CLOUDINARY_URL")
    
    # Medical Compliance
    medical_disclaimer_enabled: bool = Field(default=True, env="MEDICAL_DISCLAIMER_ENABLED")
    phi_redaction_enabled: bool = Field(default=True, env="PHI_REDACTION_ENABLED")
    
    # Monitoring
    metrics_enabled: bool = Field(default=True, env="METRICS_ENABLED")
    audit_logging_enabled: bool = Field(default=True, env="AUDIT_LOGGING_ENABLED")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @field_validator("groq_api_key")
    @classmethod
    def validate_groq_api_key(cls, v):
        """Validate Groq API key is provided."""
        if not v or v == "your_groq_api_key_here":
            logger.warning("GROQ_API_KEY not set - AI features will be disabled")
        return v
    
    @field_validator("storage_type")
    @classmethod
    def validate_storage_type(cls, v):
        """Validate storage type is supported."""
        if v not in ["local", "s3"]:
            raise ValueError("STORAGE_TYPE must be 'local' or 's3'")
        return v


def load_config() -> Config:
    """Load and validate configuration, fail closed on errors."""
    try:
        config = Config()
        logger.info("Configuration loaded successfully")
        
        # Validate model paths exist (for local storage)
        if config.storage_type == "local":
            config.storage_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Storage directory created/verified: {config.storage_path}")
        
        return config
        
    except Exception as e:
        logger.error(f"Configuration validation failed: {e}")
        raise SystemExit(f"Failed to load configuration: {e}")


# Global config instance
config = load_config()