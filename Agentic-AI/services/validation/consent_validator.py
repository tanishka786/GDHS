"""Consent and privacy validation for medical data processing."""

from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timezone

from .exceptions import ConsentValidationError
from services.error_handler import ErrorCode

logger = logging.getLogger(__name__)


class ConsentValidator:
    """Validates user consents and enforces privacy safeguards."""
    
    # Required consents for different features
    REQUIRED_CONSENTS = {
        "hospitals": ["geolocation"],
        "data_processing": [],  # No special consents required for basic processing
        "image_analysis": [],   # No special consents required for image analysis
    }
    
    # Medical disclaimers for different contexts
    MEDICAL_DISCLAIMERS = {
        "general": (
            "This system provides informational assistance only and is not a substitute for "
            "professional medical advice, diagnosis, or treatment. Always seek the advice of "
            "qualified healthcare providers with any questions regarding medical conditions."
        ),
        "diagnostic": (
            "Diagnostic suggestions are for informational purposes only and should not be "
            "considered as medical diagnosis. Professional medical evaluation is required "
            "for accurate diagnosis and treatment planning."
        ),
        "imaging": (
            "Image analysis results are computational assessments and may not detect all "
            "abnormalities. Professional radiological interpretation is required for "
            "clinical decision-making."
        ),
        "emergency": (
            "This system is not intended for emergency medical situations. If you are "
            "experiencing a medical emergency, contact emergency services immediately."
        )
    }
    
    def __init__(self, strict_mode: bool = True):
        """Initialize consent validator.
        
        Args:
            strict_mode: If True, enforce strict consent validation
        """
        self.strict_mode = strict_mode
    
    def validate_consents(self, 
                         consents: Dict[str, Any], 
                         required_features: List[str]) -> Dict[str, Any]:
        """Validate that required consents are provided for requested features.
        
        Args:
            consents: Dictionary of consent values
            required_features: List of features that require consent validation
            
        Returns:
            Dictionary with validation results and applicable disclaimers
            
        Raises:
            ConsentValidationError: If required consents are missing
        """
        try:
            validation_result = {
                "valid": True,
                "missing_consents": [],
                "applicable_disclaimers": [],
                "privacy_safeguards_applied": True,
                "validated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Check each required feature
            for feature in required_features:
                missing = self._check_feature_consents(consents, feature)
                if missing:
                    validation_result["missing_consents"].extend(missing)
                    validation_result["valid"] = False
            
            # Add applicable medical disclaimers
            validation_result["applicable_disclaimers"] = self._get_applicable_disclaimers(
                required_features
            )
            
            # If validation failed and in strict mode, raise error
            if not validation_result["valid"] and self.strict_mode:
                missing_list = ", ".join(validation_result["missing_consents"])
                raise ConsentValidationError(
                    f"Missing required consents: {missing_list}",
                    ErrorCode.MISSING_CONSENTS
                )
            
            return validation_result
            
        except ConsentValidationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error validating consents: {e}")
            raise ConsentValidationError(
                f"Failed to validate consents: {str(e)}",
                "CONSENT_VALIDATION_ERROR"
            )
    
    def _check_feature_consents(self, consents: Dict[str, Any], feature: str) -> List[str]:
        """Check if required consents are provided for a specific feature.
        
        Returns:
            List of missing consent names
        """
        required_consents = self.REQUIRED_CONSENTS.get(feature, [])
        missing_consents = []
        
        for consent_name in required_consents:
            consent_value = consents.get(consent_name)
            
            # Check if consent is explicitly granted
            if not self._is_consent_granted(consent_value):
                missing_consents.append(f"{feature}.{consent_name}")
        
        return missing_consents
    
    def _is_consent_granted(self, consent_value: Any) -> bool:
        """Check if a consent value represents granted consent."""
        if consent_value is None:
            return False
        
        # Handle boolean values
        if isinstance(consent_value, bool):
            return consent_value
        
        # Handle string values
        if isinstance(consent_value, str):
            return consent_value.lower() in ("true", "yes", "granted", "1")
        
        # Handle numeric values
        if isinstance(consent_value, (int, float)):
            return bool(consent_value)
        
        return False
    
    def _get_applicable_disclaimers(self, features: List[str]) -> List[Dict[str, str]]:
        """Get applicable medical disclaimers for requested features."""
        disclaimers = []
        
        # Always include general disclaimer
        disclaimers.append({
            "type": "general",
            "text": self.MEDICAL_DISCLAIMERS["general"]
        })
        
        # Add feature-specific disclaimers
        if any("diagnostic" in feature or "triage" in feature for feature in features):
            disclaimers.append({
                "type": "diagnostic", 
                "text": self.MEDICAL_DISCLAIMERS["diagnostic"]
            })
        
        if any("image" in feature or "vision" in feature for feature in features):
            disclaimers.append({
                "type": "imaging",
                "text": self.MEDICAL_DISCLAIMERS["imaging"]
            })
        
        # Always include emergency disclaimer for medical contexts
        disclaimers.append({
            "type": "emergency",
            "text": self.MEDICAL_DISCLAIMERS["emergency"]
        })
        
        return disclaimers
    
    def enforce_privacy_safeguards(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply privacy safeguards to prevent patient data storage.
        
        Args:
            request_data: Request data that may contain sensitive information
            
        Returns:
            Sanitized request data with privacy safeguards applied
        """
        try:
            # Create a copy to avoid modifying original data
            sanitized_data = request_data.copy()
            
            # Remove or redact potentially sensitive fields
            sensitive_fields = [
                "patient_id", "patient_name", "ssn", "medical_record_number",
                "date_of_birth", "phone_number", "email", "address",
                "insurance_id", "emergency_contact"
            ]
            
            for field in sensitive_fields:
                if field in sanitized_data:
                    logger.warning(f"Removing sensitive field '{field}' from request data")
                    del sanitized_data[field]
            
            # Add privacy metadata
            sanitized_data["_privacy_safeguards"] = {
                "applied_at": datetime.now(timezone.utc).isoformat(),
                "sensitive_fields_removed": [
                    field for field in sensitive_fields if field in request_data
                ],
                "data_retention_policy": "no_storage",
                "processing_mode": "ephemeral"
            }
            
            return sanitized_data
            
        except Exception as e:
            logger.error(f"Error applying privacy safeguards: {e}")
            # In case of error, return empty dict to prevent data leakage
            return {
                "_privacy_safeguards": {
                    "applied_at": datetime.now(timezone.utc).isoformat(),
                    "error": "Privacy safeguard application failed",
                    "data_retention_policy": "no_storage",
                    "processing_mode": "ephemeral"
                }
            }
    
    def validate_hospitals_access(self, consents: Dict[str, Any]) -> bool:
        """Specifically validate access to hospitals feature.
        
        Args:
            consents: User consent dictionary
            
        Returns:
            True if hospitals access is allowed
            
        Raises:
            ConsentValidationError: If geolocation consent is not granted
        """
        geolocation_consent = consents.get("geolocation")
        
        if not self._is_consent_granted(geolocation_consent):
            raise ConsentValidationError(
                "Geolocation consent is required to access hospital information. "
                "Please grant geolocation consent to use this feature.",
                ErrorCode.GEOLOCATION_CONSENT_REQUIRED
            )
        
        return True
    
    def get_response_with_disclaimers(self, 
                                    response_data: Dict[str, Any],
                                    features_used: List[str]) -> Dict[str, Any]:
        """Add medical disclaimers to response data.
        
        Args:
            response_data: Original response data
            features_used: List of features that were used in processing
            
        Returns:
            Response data with medical disclaimers added
        """
        enhanced_response = response_data.copy()
        
        # Add disclaimers
        enhanced_response["medical_disclaimers"] = self._get_applicable_disclaimers(features_used)
        
        # Add privacy notice
        enhanced_response["privacy_notice"] = {
            "data_retention": "No patient data is stored by this system",
            "processing_mode": "Ephemeral processing only",
            "compliance": "Designed for healthcare data privacy standards"
        }
        
        return enhanced_response