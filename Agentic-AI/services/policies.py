"""Policies and gates service for orchestrator configuration and validation."""

import hashlib
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from uuid import UUID
from enum import Enum
from dataclasses import dataclass, asdict
from loguru import logger

from schemas.orchestrator import StepName, StepStatus, ProcessingMode
from app.config import config


class RetryPolicy(str, Enum):
    """Retry policy types."""
    NEVER = "never"
    ONCE = "once"
    EXPONENTIAL = "exponential"


@dataclass
class StepPolicy:
    """Policy configuration for individual steps."""
    timeout_seconds: int
    retry_policy: RetryPolicy
    max_retries: int
    is_fatal_on_error: bool
    can_be_skipped: bool
    
    def should_retry(self, current_retry_count: int, error_type: str) -> bool:
        """Determine if step should be retried based on policy."""
        if self.retry_policy == RetryPolicy.NEVER:
            return False
        
        if current_retry_count >= self.max_retries:
            return False
        
        if self.retry_policy == RetryPolicy.ONCE:
            return current_retry_count == 0
        
        # For transient errors only
        transient_errors = ["timeout", "connection", "temporary", "rate_limit"]
        is_transient = any(err in error_type.lower() for err in transient_errors)
        
        return is_transient


@dataclass
class PolicyConfiguration:
    """Complete policy configuration for the orchestrator."""
    
    # Detection thresholds
    router_threshold: float = 0.70
    detector_score_min: float = 0.35
    nms_iou: float = 0.50
    
    # Triage thresholds
    triage_red_threshold: float = 0.8
    triage_amber_threshold: float = 0.6
    triage_high_confidence_threshold: float = 0.8
    triage_medium_confidence_threshold: float = 0.6
    
    # Triage patterns (configurable)
    triage_red_patterns: List[str] = None
    triage_amber_patterns: List[str] = None
    triage_green_patterns: List[str] = None
    
    # Global retry settings
    max_retries: int = 1
    
    # Step-specific policies
    step_policies: Dict[StepName, StepPolicy] = None
    
    # Metadata
    config_hash: str = ""
    created_at: datetime = None
    version: str = "1.0.0"
    
    def __post_init__(self):
        """Initialize default step policies if not provided."""
        if self.step_policies is None:
            self.step_policies = self._create_default_step_policies()
        
        if self.triage_red_patterns is None:
            self.triage_red_patterns = self._create_default_red_patterns()
        
        if self.triage_amber_patterns is None:
            self.triage_amber_patterns = self._create_default_amber_patterns()
        
        if self.triage_green_patterns is None:
            self.triage_green_patterns = self._create_default_green_patterns()
        
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        
        # Generate config hash
        self.config_hash = self._generate_config_hash()
    
    def _create_default_red_patterns(self) -> List[str]:
        """Create default red (high severity) triage patterns."""
        return [
            "displaced_fracture",
            "comminuted_fracture", 
            "open_fracture",
            "multiple_fractures"
        ]
    
    def _create_default_amber_patterns(self) -> List[str]:
        """Create default amber (medium severity) triage patterns."""
        return [
            "fracture",
            "oblique_fracture",
            "spiral_fracture"
        ]
    
    def _create_default_green_patterns(self) -> List[str]:
        """Create default green (low severity) triage patterns."""
        return [
            "hairline_fracture",
            "stress_fracture",
            "avulsion_fracture"
        ]
    
    def _create_default_step_policies(self) -> Dict[StepName, StepPolicy]:
        """Create default step policies based on requirements."""
        return {
            StepName.VALIDATE: StepPolicy(
                timeout_seconds=5,
                retry_policy=RetryPolicy.NEVER,
                max_retries=0,
                is_fatal_on_error=True,
                can_be_skipped=False
            ),
            StepName.ROUTE: StepPolicy(
                timeout_seconds=2,
                retry_policy=RetryPolicy.ONCE,
                max_retries=1,
                is_fatal_on_error=True,
                can_be_skipped=False
            ),
            StepName.DETECT_HAND: StepPolicy(
                timeout_seconds=12,
                retry_policy=RetryPolicy.ONCE,
                max_retries=1,
                is_fatal_on_error=False,
                can_be_skipped=True
            ),
            StepName.DETECT_LEG: StepPolicy(
                timeout_seconds=12,
                retry_policy=RetryPolicy.ONCE,
                max_retries=1,
                is_fatal_on_error=False,
                can_be_skipped=True
            ),
            StepName.TRIAGE: StepPolicy(
                timeout_seconds=2,
                retry_policy=RetryPolicy.NEVER,  # Never block triage
                max_retries=0,
                is_fatal_on_error=False,
                can_be_skipped=False
            ),
            StepName.DIAGNOSE: StepPolicy(
                timeout_seconds=5,
                retry_policy=RetryPolicy.ONCE,
                max_retries=1,
                is_fatal_on_error=False,
                can_be_skipped=True
            ),
            StepName.REPORT: StepPolicy(
                timeout_seconds=5,
                retry_policy=RetryPolicy.ONCE,
                max_retries=1,
                is_fatal_on_error=False,
                can_be_skipped=True
            ),
            StepName.HOSPITALS: StepPolicy(
                timeout_seconds=3,
                retry_policy=RetryPolicy.ONCE,
                max_retries=1,
                is_fatal_on_error=False,
                can_be_skipped=True
            )
        }
    
    def _generate_config_hash(self) -> str:
        """Generate SHA256 hash of configuration for tracking."""
        config_dict = {
            "router_threshold": self.router_threshold,
            "detector_score_min": self.detector_score_min,
            "nms_iou": self.nms_iou,
            "triage_red_threshold": self.triage_red_threshold,
            "triage_amber_threshold": self.triage_amber_threshold,
            "triage_high_confidence_threshold": self.triage_high_confidence_threshold,
            "triage_medium_confidence_threshold": self.triage_medium_confidence_threshold,
            "triage_red_patterns": self.triage_red_patterns,
            "triage_amber_patterns": self.triage_amber_patterns,
            "triage_green_patterns": self.triage_green_patterns,
            "max_retries": self.max_retries,
            "step_policies": {
                step.value: asdict(policy) 
                for step, policy in self.step_policies.items()
            },
            "version": self.version
        }
        
        config_json = json.dumps(config_dict, sort_keys=True)
        return hashlib.sha256(config_json.encode()).hexdigest()[:16]
    
    def get_step_policy(self, step_name: StepName) -> StepPolicy:
        """Get policy for a specific step."""
        return self.step_policies.get(step_name, StepPolicy(
            timeout_seconds=30,
            retry_policy=RetryPolicy.NEVER,
            max_retries=0,
            is_fatal_on_error=False,
            can_be_skipped=True
        ))
    
    def apply_overrides(self, overrides: Dict[str, Any]) -> 'PolicyConfiguration':
        """Apply configuration overrides for advanced mode."""
        new_config = PolicyConfiguration(
            router_threshold=overrides.get('router_threshold', self.router_threshold),
            detector_score_min=overrides.get('detector_score_min', self.detector_score_min),
            nms_iou=overrides.get('nms_iou', self.nms_iou),
            triage_red_threshold=overrides.get('triage_red_threshold', self.triage_red_threshold),
            triage_amber_threshold=overrides.get('triage_amber_threshold', self.triage_amber_threshold),
            triage_high_confidence_threshold=overrides.get('triage_high_confidence_threshold', self.triage_high_confidence_threshold),
            triage_medium_confidence_threshold=overrides.get('triage_medium_confidence_threshold', self.triage_medium_confidence_threshold),
            triage_red_patterns=overrides.get('triage_red_patterns', self.triage_red_patterns.copy()),
            triage_amber_patterns=overrides.get('triage_amber_patterns', self.triage_amber_patterns.copy()),
            triage_green_patterns=overrides.get('triage_green_patterns', self.triage_green_patterns.copy()),
            max_retries=overrides.get('max_retries', self.max_retries),
            step_policies=self.step_policies.copy(),
            version=self.version
        )
        
        # Apply timeout overrides
        if 'timeout_overrides' in overrides:
            timeout_overrides = overrides['timeout_overrides']
            for step_name, timeout in timeout_overrides.items():
                # Handle special case for "detect" which applies to both hand and leg detection
                if step_name == "detect":
                    for detect_step in [StepName.DETECT_HAND, StepName.DETECT_LEG]:
                        if detect_step in new_config.step_policies:
                            policy = new_config.step_policies[detect_step]
                            new_config.step_policies[detect_step] = StepPolicy(
                                timeout_seconds=timeout,
                                retry_policy=policy.retry_policy,
                                max_retries=policy.max_retries,
                                is_fatal_on_error=policy.is_fatal_on_error,
                                can_be_skipped=policy.can_be_skipped
                            )
                else:
                    try:
                        step_enum = StepName(step_name)
                        if step_enum in new_config.step_policies:
                            policy = new_config.step_policies[step_enum]
                            new_config.step_policies[step_enum] = StepPolicy(
                                timeout_seconds=timeout,
                                retry_policy=policy.retry_policy,
                                max_retries=policy.max_retries,
                                is_fatal_on_error=policy.is_fatal_on_error,
                                can_be_skipped=policy.can_be_skipped
                            )
                    except ValueError:
                        logger.warning(f"Invalid step name in timeout override: {step_name}")
        
        # Regenerate hash after overrides
        new_config.config_hash = new_config._generate_config_hash()
        return new_config


class PolicyService:
    """Service for managing orchestrator policies and gates."""
    
    def __init__(self):
        """Initialize policy service with default configuration."""
        self._default_config = self._load_default_config()
        self._active_configs: Dict[UUID, PolicyConfiguration] = {}
        logger.info(f"PolicyService initialized with config hash: {self._default_config.config_hash}")
    
    def _load_default_config(self) -> PolicyConfiguration:
        """Load default configuration from app config."""
        return PolicyConfiguration(
            router_threshold=config.router_threshold,
            detector_score_min=config.detector_score_min,
            nms_iou=config.nms_iou,
            triage_red_threshold=config.triage_red_threshold,
            triage_amber_threshold=config.triage_amber_threshold,
            triage_high_confidence_threshold=config.triage_high_confidence_threshold,
            triage_medium_confidence_threshold=config.triage_medium_confidence_threshold,
            max_retries=config.max_retries
        )
    
    def get_config_for_request(self, request_id: UUID, mode: ProcessingMode, 
                             overrides: Optional[Dict[str, Any]] = None) -> PolicyConfiguration:
        """Get configuration for a specific request."""
        if overrides and mode == ProcessingMode.ADVANCED:
            # Apply overrides for advanced mode
            request_config = self._default_config.apply_overrides(overrides)
            self._active_configs[request_id] = request_config
            logger.info(f"Applied config overrides for request {request_id}: {request_config.config_hash}")
            return request_config
        else:
            # Use default config
            self._active_configs[request_id] = self._default_config
            return self._default_config
    
    def get_step_timeout(self, request_id: UUID, step_name: StepName) -> int:
        """Get timeout for a specific step in a request."""
        config = self._active_configs.get(request_id, self._default_config)
        policy = config.get_step_policy(step_name)
        return policy.timeout_seconds
    
    def should_retry_step(self, request_id: UUID, step_name: StepName, 
                         current_retry_count: int, error_type: str) -> bool:
        """Determine if a step should be retried."""
        config = self._active_configs.get(request_id, self._default_config)
        policy = config.get_step_policy(step_name)
        
        # Special rule: never block triage if later steps fail
        if step_name == StepName.TRIAGE:
            return False
        
        return policy.should_retry(current_retry_count, error_type)
    
    def is_step_fatal_on_error(self, request_id: UUID, step_name: StepName) -> bool:
        """Check if step error should stop the entire pipeline."""
        config = self._active_configs.get(request_id, self._default_config)
        policy = config.get_step_policy(step_name)
        return policy.is_fatal_on_error
    
    def can_skip_step(self, request_id: UUID, step_name: StepName) -> bool:
        """Check if step can be skipped in case of errors."""
        config = self._active_configs.get(request_id, self._default_config)
        policy = config.get_step_policy(step_name)
        return policy.can_be_skipped
    
    def get_detection_thresholds(self, request_id: UUID) -> Dict[str, float]:
        """Get detection thresholds for a request."""
        config = self._active_configs.get(request_id, self._default_config)
        return {
            "router_threshold": config.router_threshold,
            "detector_score_min": config.detector_score_min,
            "nms_iou": config.nms_iou
        }
    
    def get_triage_config(self, request_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Get triage configuration for a request."""
        config = self._active_configs.get(request_id, self._default_config) if request_id else self._default_config
        return {
            "red_threshold": config.triage_red_threshold,
            "amber_threshold": config.triage_amber_threshold,
            "high_confidence_threshold": config.triage_high_confidence_threshold,
            "medium_confidence_threshold": config.triage_medium_confidence_threshold,
            "red_patterns": config.triage_red_patterns,
            "amber_patterns": config.triage_amber_patterns,
            "green_patterns": config.triage_green_patterns
        }
    
    def get_config_metadata(self, request_id: UUID) -> Dict[str, Any]:
        """Get configuration metadata for audit logging."""
        config = self._active_configs.get(request_id, self._default_config)
        return {
            "config_hash": config.config_hash,
            "version": config.version,
            "created_at": config.created_at.isoformat(),
            "thresholds": {
                "router_threshold": config.router_threshold,
                "detector_score_min": config.detector_score_min,
                "nms_iou": config.nms_iou,
                "triage_red_threshold": config.triage_red_threshold,
                "triage_amber_threshold": config.triage_amber_threshold,
                "triage_high_confidence_threshold": config.triage_high_confidence_threshold,
                "triage_medium_confidence_threshold": config.triage_medium_confidence_threshold
            },
            "triage_patterns": {
                "red_patterns": config.triage_red_patterns,
                "amber_patterns": config.triage_amber_patterns,
                "green_patterns": config.triage_green_patterns
            },
            "timeouts": {
                step.value: policy.timeout_seconds 
                for step, policy in config.step_policies.items()
            }
        }
    
    def cleanup_request_config(self, request_id: UUID) -> None:
        """Clean up configuration for completed request."""
        if request_id in self._active_configs:
            del self._active_configs[request_id]
            logger.debug(f"Cleaned up config for request {request_id}")
    
    def validate_overrides(self, overrides: Dict[str, Any]) -> List[str]:
        """Validate configuration overrides and return any errors."""
        errors = []
        
        # Validate threshold ranges
        if 'router_threshold' in overrides:
            val = overrides['router_threshold']
            if not isinstance(val, (int, float)) or not 0.0 <= val <= 1.0:
                errors.append("router_threshold must be between 0.0 and 1.0")
        
        if 'detector_score_min' in overrides:
            val = overrides['detector_score_min']
            if not isinstance(val, (int, float)) or not 0.0 <= val <= 1.0:
                errors.append("detector_score_min must be between 0.0 and 1.0")
        
        if 'nms_iou' in overrides:
            val = overrides['nms_iou']
            if not isinstance(val, (int, float)) or not 0.0 <= val <= 1.0:
                errors.append("nms_iou must be between 0.0 and 1.0")
        
        # Validate triage thresholds
        for threshold_name in ['triage_red_threshold', 'triage_amber_threshold', 
                              'triage_high_confidence_threshold', 'triage_medium_confidence_threshold']:
            if threshold_name in overrides:
                val = overrides[threshold_name]
                if not isinstance(val, (int, float)) or not 0.0 <= val <= 1.0:
                    errors.append(f"{threshold_name} must be between 0.0 and 1.0")
        
        # Validate triage patterns
        for pattern_name in ['triage_red_patterns', 'triage_amber_patterns', 'triage_green_patterns']:
            if pattern_name in overrides:
                val = overrides[pattern_name]
                if not isinstance(val, list) or not all(isinstance(p, str) for p in val):
                    errors.append(f"{pattern_name} must be a list of strings")
        
        if 'max_retries' in overrides:
            val = overrides['max_retries']
            if not isinstance(val, int) or val < 0:
                errors.append("max_retries must be a non-negative integer")
        
        # Validate timeout overrides
        if 'timeout_overrides' in overrides:
            timeout_overrides = overrides['timeout_overrides']
            if not isinstance(timeout_overrides, dict):
                errors.append("timeout_overrides must be a dictionary")
            else:
                valid_steps = {step.value for step in StepName}
                valid_steps.add("detect")  # Special case for both hand and leg detection
                for step_name, timeout in timeout_overrides.items():
                    if step_name not in valid_steps:
                        errors.append(f"Invalid step name: {step_name}")
                    elif not isinstance(timeout, int) or timeout <= 0:
                        errors.append(f"Timeout for {step_name} must be a positive integer")
        
        return errors


# Global policy service instance
policy_service = PolicyService()