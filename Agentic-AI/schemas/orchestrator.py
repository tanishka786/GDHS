"""Orchestrator schemas for step tracking and processing modes."""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from uuid import UUID, uuid4

from .base import ProcessingMode, BodyPart, TriageLevel


class StepStatus(str, Enum):
    """Status of individual processing steps."""
    PENDING = "pending"
    RUNNING = "running"
    OK = "ok"
    ERROR = "error"
    SKIPPED = "skipped"
    TIMEOUT = "timeout"


class StepName(str, Enum):
    """Available processing steps."""
    VALIDATE = "validate"
    ROUTE = "route"
    DETECT_HAND = "detect_hand"
    DETECT_LEG = "detect_leg"
    TRIAGE = "triage"
    DIAGNOSE = "diagnose"
    REPORT = "report"
    HOSPITALS = "hospitals"


class ProcessingStep(BaseModel):
    """Individual step in the processing pipeline."""
    name: StepName
    status: StepStatus = StepStatus.PENDING
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    artifacts: Dict[str, str] = Field(default_factory=dict)  # artifact_type -> file_id
    
    def start(self) -> None:
        """Mark step as started."""
        self.status = StepStatus.RUNNING
        self.started_at = datetime.utcnow()
    
    def complete(self, confidence: Optional[float] = None, artifacts: Optional[Dict[str, str]] = None) -> None:
        """Mark step as completed successfully."""
        self.status = StepStatus.OK
        self.completed_at = datetime.utcnow()
        if self.started_at:
            self.duration_ms = int((self.completed_at - self.started_at).total_seconds() * 1000)
        if confidence is not None:
            self.confidence = confidence
        if artifacts:
            self.artifacts.update(artifacts)
    
    def fail(self, error_message: str) -> None:
        """Mark step as failed."""
        self.status = StepStatus.ERROR
        self.completed_at = datetime.utcnow()
        if self.started_at:
            self.duration_ms = int((self.completed_at - self.started_at).total_seconds() * 1000)
        self.error_message = error_message
    
    def timeout(self) -> None:
        """Mark step as timed out."""
        self.status = StepStatus.TIMEOUT
        self.completed_at = datetime.utcnow()
        if self.started_at:
            self.duration_ms = int((self.completed_at - self.started_at).total_seconds() * 1000)
        self.error_message = "Step timed out"
    
    def skip(self, reason: str) -> None:
        """Mark step as skipped."""
        self.status = StepStatus.SKIPPED
        self.completed_at = datetime.utcnow()
        self.error_message = reason


class StepGraph(BaseModel):
    """Complete step tracking for a processing request."""
    request_id: UUID = Field(default_factory=uuid4)
    mode: ProcessingMode
    steps: List[ProcessingStep] = Field(default_factory=list)
    partial: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Configuration snapshot
    config_hash: Optional[str] = None
    thresholds: Dict[str, float] = Field(default_factory=dict)
    timeouts: Dict[str, int] = Field(default_factory=dict)
    
    # Results
    detected_body_part: Optional[BodyPart] = None
    triage_level: Optional[TriageLevel] = None
    
    def get_step(self, step_name: StepName) -> Optional[ProcessingStep]:
        """Get a specific step by name."""
        for step in self.steps:
            if step.name == step_name:
                return step
        return None
    
    def add_step(self, step_name: StepName) -> ProcessingStep:
        """Add a new step to the graph."""
        step = ProcessingStep(name=step_name)
        self.steps.append(step)
        self.updated_at = datetime.utcnow()
        return step
    
    def update_step(self, step_name: StepName, **kwargs) -> Optional[ProcessingStep]:
        """Update an existing step."""
        step = self.get_step(step_name)
        if step:
            for key, value in kwargs.items():
                if hasattr(step, key):
                    setattr(step, key, value)
            self.updated_at = datetime.utcnow()
        return step
    
    def is_complete(self) -> bool:
        """Check if all steps are completed (ok, error, skipped, or timeout)."""
        terminal_statuses = {StepStatus.OK, StepStatus.ERROR, StepStatus.SKIPPED, StepStatus.TIMEOUT}
        return all(step.status in terminal_statuses for step in self.steps)
    
    def has_fatal_error(self) -> bool:
        """Check if there's a fatal error that should stop processing."""
        # Fatal errors are in validation or routing steps
        fatal_steps = {StepName.VALIDATE, StepName.ROUTE}
        for step in self.steps:
            if step.name in fatal_steps and step.status == StepStatus.ERROR:
                return True
        return False
    
    def get_successful_steps(self) -> List[ProcessingStep]:
        """Get all successfully completed steps."""
        return [step for step in self.steps if step.status == StepStatus.OK]
    
    def get_failed_steps(self) -> List[ProcessingStep]:
        """Get all failed steps."""
        return [step for step in self.steps if step.status in {StepStatus.ERROR, StepStatus.TIMEOUT}]


class GuidedPrompt(BaseModel):
    """Prompt for user input in guided mode."""
    prompt_id: UUID = Field(default_factory=uuid4)
    step_name: StepName
    prompt_type: str  # "low_confidence", "consent_required", "error_recovery"
    message: str
    options: Optional[List[str]] = None
    confidence: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProcessingRequest(BaseModel):
    """Request for processing with orchestrator."""
    image_url: str
    mode: ProcessingMode = ProcessingMode.AUTO
    symptoms: Optional[str] = None
    consents: Dict[str, bool] = Field(default_factory=dict)
    overrides: Dict[str, Any] = Field(default_factory=dict)  # For advanced mode
    
    # Advanced mode configuration overrides
    router_threshold_override: Optional[float] = Field(None, ge=0.0, le=1.0)
    detector_score_override: Optional[float] = Field(None, ge=0.0, le=1.0)
    timeout_overrides: Optional[Dict[str, int]] = None


class ProcessingResponse(BaseModel):
    """Response from orchestrator processing."""
    request_id: UUID
    step_graph: StepGraph
    guided_prompts: List[GuidedPrompt] = Field(default_factory=list)
    
    # Results (when available)
    triage_result: Optional[Dict[str, Any]] = None
    diagnosis_result: Optional[Dict[str, Any]] = None
    report_manifest: Optional[Dict[str, str]] = None
    hospitals_result: Optional[List[Dict[str, Any]]] = None
    
    # Artifacts
    artifacts: Dict[str, str] = Field(default_factory=dict)  # artifact_type -> file_id