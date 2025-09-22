"""Security and authorization services for the orthopedic assistant."""

import hashlib
import hmac
import secrets
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from uuid import UUID
from loguru import logger

from app.config import config
from services.error_handler import ValidationError, ErrorCode


class SecurityError(Exception):
    """Base security error."""
    
    def __init__(self, message: str, error_code: str = "SECURITY_ERROR"):
        super().__init__(message)
        self.message = message
        self.error_code = error_code


class AuthorizationError(SecurityError):
    """Authorization specific error."""
    
    def __init__(self, message: str, error_code: str = "AUTHORIZATION_ERROR"):
        super().__init__(message, error_code)


class DataSanitizer:
    """Sanitizes data to prevent PHI leakage and security issues."""
    
    # Patterns that might contain PHI or sensitive data
    PHI_PATTERNS = [
        "ssn", "social_security", "patient_id", "medical_record", "mrn",
        "date_of_birth", "dob", "phone", "email", "address", "zip",
        "insurance", "emergency_contact", "next_of_kin", "guardian"
    ]
    
    # Sensitive configuration keys that should never be logged
    SENSITIVE_CONFIG_KEYS = [
        "api_key", "secret", "password", "token", "credential",
        "groq_api_key", "aws_access_key", "aws_secret_access_key"
    ]
    
    @classmethod
    def sanitize_for_logging(cls, data: Any) -> Any:
        """Sanitize data for safe logging (removes PHI and secrets)."""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                key_lower = key.lower()
                
                # Check if key contains sensitive patterns
                if any(pattern in key_lower for pattern in cls.PHI_PATTERNS + cls.SENSITIVE_CONFIG_KEYS):
                    sanitized[key] = "[REDACTED]"
                else:
                    sanitized[key] = cls.sanitize_for_logging(value)
            return sanitized
        
        elif isinstance(data, list):
            return [cls.sanitize_for_logging(item) for item in data]
        
        elif isinstance(data, bytes):
            # Handle binary data (like images) - don't try to decode as UTF-8
            return f"[BINARY_DATA:{len(data)}bytes]"
        
        elif isinstance(data, str):
            # Redact potential API keys or tokens
            if len(data) > 20 and any(char.isalnum() for char in data):
                # Looks like it could be an API key
                return f"[REDACTED:{len(data)}chars]"
            return data
        
        else:
            return data
    
    @classmethod
    def sanitize_error_message(cls, error_message: str) -> str:
        """Sanitize error messages to prevent information leakage."""
        # Handle non-string inputs gracefully
        if not isinstance(error_message, str):
            if isinstance(error_message, bytes):
                return f"[BINARY_ERROR_DATA:{len(error_message)}bytes]"
            else:
                return str(error_message)
        
        # Remove file paths that might contain sensitive info
        import re
        
        # Remove absolute paths
        error_message = re.sub(r'/[^\s]+', '[PATH_REDACTED]', error_message)
        error_message = re.sub(r'C:\\[^\s]+', '[PATH_REDACTED]', error_message)
        
        # Remove potential API keys or tokens in error messages (alphanumeric strings > 15 chars)
        error_message = re.sub(r'\b[a-zA-Z0-9]{16,}\b', '[TOKEN_REDACTED]', error_message)
        
        return error_message
    
    @classmethod
    def validate_request_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize request data."""
        sanitized = {}
        
        for key, value in data.items():
            # Check for PHI in request data
            key_lower = key.lower()
            if any(pattern in key_lower for pattern in cls.PHI_PATTERNS):
                logger.warning(f"Potential PHI detected in request field: {key}")
                # Don't include PHI fields in processed data
                continue
            
            # Sanitize string values
            if isinstance(value, str):
                # Basic input sanitization
                value = value.strip()
                # Limit string length to prevent DoS
                if len(value) > 10000:
                    value = value[:10000]
            
            sanitized[key] = value
        
        return sanitized


class ReportAuthorizer:
    """Handles authorization for report access."""
    
    def __init__(self):
        self.access_tokens: Dict[str, Dict[str, Any]] = {}
        self.token_expiry_hours = 24
    
    def generate_access_token(self, request_id: UUID, pdf_id: str) -> str:
        """Generate a secure access token for report access."""
        # Create token payload
        payload = {
            "request_id": str(request_id),
            "pdf_id": pdf_id,
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=self.token_expiry_hours)).isoformat()
        }
        
        # Generate secure token
        token = secrets.token_urlsafe(32)
        
        # Store token with payload
        self.access_tokens[token] = payload
        
        logger.info(f"Generated access token for report {pdf_id} (request: {request_id})")
        return token
    
    def validate_report_access(self, pdf_id: str, token: Optional[str] = None) -> bool:
        """Validate access to a specific report."""
        try:
            # Basic PDF ID validation
            if not pdf_id or not pdf_id.startswith("file-report-"):
                raise AuthorizationError(
                    "Invalid report identifier format",
                    "INVALID_REPORT_ID"
                )
            
            # For now, implement basic validation
            # In production, this would check against user sessions, permissions, etc.
            
            if token:
                # Validate token if provided
                if token not in self.access_tokens:
                    raise AuthorizationError(
                        "Invalid or expired access token",
                        "INVALID_ACCESS_TOKEN"
                    )
                
                token_data = self.access_tokens[token]
                
                # Check if token is expired
                expires_at = datetime.fromisoformat(token_data["expires_at"].replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expires_at:
                    # Clean up expired token
                    del self.access_tokens[token]
                    raise AuthorizationError(
                        "Access token has expired",
                        "TOKEN_EXPIRED"
                    )
                
                # Check if token is for the requested report
                if token_data["pdf_id"] != pdf_id:
                    raise AuthorizationError(
                        "Access token not valid for this report",
                        "TOKEN_MISMATCH"
                    )
            
            return True
            
        except AuthorizationError:
            raise
        except Exception as e:
            logger.error(f"Error validating report access: {e}")
            raise AuthorizationError(
                "Failed to validate report access",
                "AUTHORIZATION_VALIDATION_ERROR"
            )
    
    def cleanup_expired_tokens(self):
        """Clean up expired access tokens."""
        current_time = datetime.now(timezone.utc)
        expired_tokens = []
        
        for token, data in self.access_tokens.items():
            expires_at = datetime.fromisoformat(data["expires_at"].replace('Z', '+00:00'))
            if current_time > expires_at:
                expired_tokens.append(token)
        
        for token in expired_tokens:
            del self.access_tokens[token]
        
        if expired_tokens:
            logger.info(f"Cleaned up {len(expired_tokens)} expired access tokens")


class RequestValidator:
    """Validates and sanitizes incoming requests."""
    
    # Rate limiting configuration
    RATE_LIMITS = {
        "analyze": {"requests": 10, "window_minutes": 1},
        "reports": {"requests": 50, "window_minutes": 1},
        "status": {"requests": 100, "window_minutes": 1}
    }
    
    def __init__(self):
        self.request_history: Dict[str, List[float]] = {}
    
    def validate_analyze_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize analyze request."""
        try:
            # Sanitize input data
            sanitized = DataSanitizer.validate_request_data(request_data)
            # Ensure either image_url or image_data is provided
            image_url = sanitized.get("image_url")
            image_data = sanitized.get("image_data")

            if not image_url and not image_data:
                # Use project ValidationError so upstream handlers return proper 4xx
                raise ValidationError("Either image_url or image_data must be provided", ErrorCode.MISSING_REQUIRED_FIELD)

            # If image_url is present, ensure it's a non-empty string
            if image_url is not None:
                if not isinstance(image_url, str) or not image_url.strip():
                    raise ValidationError("image_url must be a non-empty string when provided", ErrorCode.INVALID_REQUEST_FORMAT)
            
            # Validate mode
            valid_modes = ["auto", "guided", "advanced"]
            mode = sanitized.get("mode", "auto")
            if mode not in valid_modes:
                raise SecurityError(
                    f"Invalid processing mode. Must be one of: {valid_modes}",
                    "INVALID_PROCESSING_MODE"
                )
            
            # Validate consents structure
            consents = sanitized.get("consents", {})
            if not isinstance(consents, dict):
                raise SecurityError(
                    "Consents must be a dictionary",
                    "INVALID_CONSENTS_FORMAT"
                )
            
            # Validate overrides (advanced mode only)
            overrides = sanitized.get("overrides", {})
            if overrides and mode != "advanced":
                logger.warning("Overrides provided but not in advanced mode, ignoring")
                sanitized["overrides"] = {}
            
            return sanitized
            
        except SecurityError:
            raise
        except Exception as e:
            logger.error(f"Error validating analyze request: {e}")
            raise SecurityError(
                "Request validation failed",
                "REQUEST_VALIDATION_ERROR"
            )
    
    def check_rate_limit(self, client_id: str, endpoint: str) -> bool:
        """Check if request is within rate limits."""
        try:
            current_time = time.time()
            
            # Get rate limit config for endpoint
            if endpoint not in self.RATE_LIMITS:
                return True  # No rate limit configured
            
            limit_config = self.RATE_LIMITS[endpoint]
            window_seconds = limit_config["window_minutes"] * 60
            max_requests = limit_config["requests"]
            
            # Initialize client history if needed
            if client_id not in self.request_history:
                self.request_history[client_id] = []
            
            # Clean old requests outside the window
            client_requests = self.request_history[client_id]
            client_requests[:] = [req_time for req_time in client_requests 
                                if current_time - req_time < window_seconds]
            
            # Check if within limit
            if len(client_requests) >= max_requests:
                logger.warning(f"Rate limit exceeded for client {client_id} on endpoint {endpoint}")
                return False
            
            # Add current request
            client_requests.append(current_time)
            return True
            
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            # Allow request on error to avoid blocking legitimate traffic
            return True


def verify_api_key(api_key: Optional[str] = None) -> Optional[str]:
    """
    Verify API key for authenticated endpoints.
    
    Args:
        api_key: Optional API key to verify
        
    Returns:
        The verified API key or None if no authentication required
        
    Raises:
        AuthorizationError: If API key is invalid
    """
    # For now, implement basic API key verification
    # In production, this would check against a database or key management service
    
    if api_key is None:
        # No API key provided - allow for now (can be made stricter later)
        return None
    
    # Basic API key validation
    if not isinstance(api_key, str) or len(api_key) < 10:
        raise AuthorizationError(
            "Invalid API key format",
            "INVALID_API_KEY_FORMAT"
        )
    
    # For development, accept any reasonable-looking API key
    # In production, this would validate against stored keys
    if api_key.startswith("ortho_") or api_key.startswith("test_"):
        return api_key
    
    # If no specific validation rules match, reject
    raise AuthorizationError(
        "Invalid API key",
        "INVALID_API_KEY"
    )


# Global instances
data_sanitizer = DataSanitizer()
report_authorizer = ReportAuthorizer()
request_validator = RequestValidator()