"""Base schemas for the orthopedic assistant MCP server."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class BodyPart(str, Enum):
    """Supported body parts for analysis."""
    HAND = "hand"
    LEG = "leg"
    UNKNOWN = "unknown"


class TriageLevel(str, Enum):
    """Triage classification levels."""
    RED = "RED"      # Urgent
    AMBER = "AMBER"  # Semi-urgent
    GREEN = "GREEN"  # Non-urgent


class ProcessingMode(str, Enum):
    """Processing modes for the orchestrator."""
    AUTO = "auto"
    GUIDED = "guided"
    ADVANCED = "advanced"


class BaseResponse(BaseModel):
    """Base response model with medical disclaimer."""
    success: bool = True
    message: Optional[str] = None
    medical_disclaimer: str = Field(
        default="⚠️ This information is for educational purposes only and should not replace professional medical advice, diagnosis, or treatment.",
        description="Required medical disclaimer for all responses"
    )


class ErrorResponse(BaseResponse):
    """Error response model."""
    success: bool = False
    error_code: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None


class PatientInfo(BaseModel):
    """Patient information model for medical reports."""
    patient_id: Optional[str] = Field(None, description="Patient ID")
    name: Optional[str] = Field(None, description="Patient name")
    date_of_birth: Optional[str] = Field(None, description="Patient date of birth")
    age: Optional[int] = Field(None, description="Patient age")
    gender: Optional[str] = Field(None, description="Patient gender")
    mrn: Optional[str] = Field(None, description="Medical record number")
    phone: Optional[str] = Field(None, description="Patient phone number")
    email: Optional[str] = Field(None, description="Patient email address")
    additional_notes: Optional[str] = Field(None, description="Additional patient information")


class HealthStatus(BaseModel):
    """Health check response model."""
    status: str
    server_info: Dict[str, str]
    mcp_status: Dict[str, Any]
    configuration: Dict[str, Any]
    thresholds: Dict[str, float]
    timeouts: Dict[str, int]