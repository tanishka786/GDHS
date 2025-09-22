"""Enhanced error handling with typed error codes and security safeguards."""

import traceback
from typing import Dict, Any, Optional, Union
from enum import Enum
from datetime import datetime, timezone
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from loguru import logger


class ErrorCode(str, Enum):
    """Typed error codes for the orthopedic assistant."""
    
    # Validation Errors (4xx)
    INVALID_REQUEST_FORMAT = "INVALID_REQUEST_FORMAT"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_PROCESSING_MODE = "INVALID_PROCESSING_MODE"
    INVALID_IMAGE_FORMAT = "INVALID_IMAGE_FORMAT"
    IMAGE_TOO_LARGE = "IMAGE_TOO_LARGE"
    IMAGE_TOO_SMALL = "IMAGE_TOO_SMALL"
    RESOLUTION_TOO_LOW = "RESOLUTION_TOO_LOW"
    BLANK_IMAGE = "BLANK_IMAGE"
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
    INVALID_CONSENTS_FORMAT = "INVALID_CONSENTS_FORMAT"
    MISSING_CONSENTS = "MISSING_CONSENTS"
    GEOLOCATION_CONSENT_REQUIRED = "GEOLOCATION_CONSENT_REQUIRED"
    
    # Authorization Errors (4xx)
    INVALID_REPORT_ID = "INVALID_REPORT_ID"
    INVALID_ACCESS_TOKEN = "INVALID_ACCESS_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_MISMATCH = "TOKEN_MISMATCH"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # Processing Errors (5xx)
    MODEL_LOADING_ERROR = "MODEL_LOADING_ERROR"
    INFERENCE_ERROR = "INFERENCE_ERROR"
    STORAGE_ERROR = "STORAGE_ERROR"
    GROQ_API_ERROR = "GROQ_API_ERROR"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
    ORCHESTRATION_ERROR = "ORCHESTRATION_ERROR"
    REPORT_GENERATION_ERROR = "REPORT_GENERATION_ERROR"
    
    # System Errors (5xx)
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
    DEPENDENCY_ERROR = "DEPENDENCY_ERROR"


class OrthopedicError(Exception):
    """Base exception for orthopedic assistant errors."""
    
    def __init__(self, 
                 message: str, 
                 error_code: ErrorCode,
                 details: Optional[Dict[str, Any]] = None,
                 http_status: int = 500):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.http_status = http_status
        self.timestamp = datetime.now(timezone.utc)


class ValidationError(OrthopedicError):
    """Validation related errors."""
    
    def __init__(self, message: str, error_code: ErrorCode, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, error_code, details, http_status=400)


class AuthorizationError(OrthopedicError):
    """Authorization related errors."""
    
    def __init__(self, message: str, error_code: ErrorCode, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, error_code, details, http_status=403)


class ProcessingError(OrthopedicError):
    """Processing related errors."""
    
    def __init__(self, message: str, error_code: ErrorCode, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, error_code, details, http_status=500)


class ErrorHandler:
    """Centralized error handling with security safeguards."""
    
    def __init__(self):
        self.error_counts: Dict[str, int] = {}
    
    def create_error_response(self, 
                            error: Union[OrthopedicError, Exception],
                            request_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a standardized error response with security safeguards."""
        
        # Determine error details
        if isinstance(error, OrthopedicError):
            error_code = error.error_code
            message = error.message
            http_status = error.http_status
            details = error.details
        else:
            # Handle unexpected exceptions
            error_code = ErrorCode.INTERNAL_SERVER_ERROR
            message = "An unexpected error occurred"
            http_status = 500
            details = {}
        
        # Sanitize error message and details
        from services.security import DataSanitizer
        sanitized_message = DataSanitizer.sanitize_error_message(message)
        sanitized_details = DataSanitizer.sanitize_for_logging(details)
        
        # Create response
        response = {
            "success": False,
            "error": {
                "code": error_code,
                "message": sanitized_message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "medical_disclaimer": (
                "⚠️ This information is for educational purposes only and should not "
                "replace professional medical advice, diagnosis, or treatment."
            )
        }
        
        # Add request ID if available
        if request_id:
            response["request_id"] = request_id
        
        # Add details for client errors (4xx) but not server errors (5xx)
        if http_status < 500 and sanitized_details:
            response["error"]["details"] = sanitized_details
        
        # Add support information for server errors
        if http_status >= 500:
            response["error"]["support"] = {
                "message": "Please contact support if this error persists",
                "error_id": f"ERR-{int(datetime.now().timestamp())}"
            }
        
        # Track error for monitoring
        self._track_error(error_code)
        
        return response
    
    def _track_error(self, error_code: ErrorCode):
        """Track error occurrences for monitoring."""
        error_key = error_code.value  # Use the string value, not the enum
        self.error_counts[error_key] = self.error_counts.get(error_key, 0) + 1
    
    def get_error_stats(self) -> Dict[str, int]:
        """Get error statistics for monitoring."""
        return self.error_counts.copy()
    
    def log_error(self, 
                  error: Union[OrthopedicError, Exception],
                  request_id: Optional[str] = None,
                  additional_context: Optional[Dict[str, Any]] = None):
        """Log error with appropriate level and sanitization."""
        
        # Prepare log context
        log_context = {
            "request_id": request_id,
            "error_type": type(error).__name__,
        }
        
        if additional_context:
            from services.security import DataSanitizer
            sanitized_context = DataSanitizer.sanitize_for_logging(additional_context)
            log_context.update(sanitized_context)
        
        if isinstance(error, OrthopedicError):
            # Log orthopedic errors with structured data
            log_context.update({
                "error_code": error.error_code,
                "http_status": error.http_status,
                "timestamp": error.timestamp.isoformat()
            })
            
            if error.http_status < 500:
                # Client errors - log as warning
                logger.warning(f"Client error: {error.message}", **log_context)
            else:
                # Server errors - log as error
                logger.error(f"Server error: {error.message}", **log_context)
        else:
            # Log unexpected exceptions with stack trace
            log_context["traceback"] = traceback.format_exc()
            logger.error(f"Unexpected error: {str(error)}", **log_context)


# Exception handlers for FastAPI

async def orthopedic_error_handler(request: Request, exc: OrthopedicError) -> JSONResponse:
    """Handle OrthopedicError exceptions."""
    error_handler = ErrorHandler()
    
    # Extract request ID if available
    request_id = getattr(request.state, 'request_id', None)
    
    # Log the error
    error_handler.log_error(exc, request_id)
    
    # Create response
    response_data = error_handler.create_error_response(exc, request_id)
    
    return JSONResponse(
        status_code=exc.http_status,
        content=response_data
    )


async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle validation errors specifically."""
    return await orthopedic_error_handler(request, exc)


async def authorization_error_handler(request: Request, exc: AuthorizationError) -> JSONResponse:
    """Handle authorization errors specifically."""
    return await orthopedic_error_handler(request, exc)


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions with security safeguards."""
    error_handler = ErrorHandler()
    
    # Extract request ID if available
    request_id = getattr(request.state, 'request_id', None)
    
    # Log the error
    error_handler.log_error(exc, request_id)
    
    # Create generic error response (don't leak internal details)
    orthopedic_error = OrthopedicError(
        message="An unexpected error occurred",
        error_code=ErrorCode.INTERNAL_SERVER_ERROR
    )
    
    response_data = error_handler.create_error_response(orthopedic_error, request_id)
    
    return JSONResponse(
        status_code=500,
        content=response_data
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTPExceptions with consistent format."""
    error_handler = ErrorHandler()
    
    # Map HTTP status to error code
    error_code_map = {
        400: ErrorCode.INVALID_REQUEST_FORMAT,
        401: ErrorCode.UNAUTHORIZED_ACCESS,
        403: ErrorCode.UNAUTHORIZED_ACCESS,
        404: ErrorCode.INVALID_REPORT_ID,
        429: ErrorCode.RATE_LIMIT_EXCEEDED,
        500: ErrorCode.INTERNAL_SERVER_ERROR,
        503: ErrorCode.SERVICE_UNAVAILABLE
    }
    
    error_code = error_code_map.get(exc.status_code, ErrorCode.INTERNAL_SERVER_ERROR)
    
    # Create orthopedic error
    orthopedic_error = OrthopedicError(
        message=exc.detail,
        error_code=error_code,
        http_status=exc.status_code
    )
    
    # Extract request ID if available
    request_id = getattr(request.state, 'request_id', None)
    
    # Log the error
    error_handler.log_error(orthopedic_error, request_id)
    
    # Create response
    response_data = error_handler.create_error_response(orthopedic_error, request_id)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data
    )


# Global error handler instance
error_handler = ErrorHandler()