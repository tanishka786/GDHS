"""Validation exceptions for the Orthopedic Assistant MCP Server."""

from services.error_handler import ValidationError as BaseValidationError, ErrorCode


class ValidationError(BaseValidationError):
    """Base validation error."""
    
    def __init__(self, message: str, error_code: ErrorCode = ErrorCode.VALIDATION_ERROR):
        super().__init__(message, error_code)


class ImageValidationError(ValidationError):
    """Image validation specific error."""
    
    def __init__(self, message: str, error_code: ErrorCode = ErrorCode.IMAGE_VALIDATION_ERROR):
        super().__init__(message, error_code)


class ConsentValidationError(ValidationError):
    """Consent validation specific error."""
    
    def __init__(self, message: str, error_code: ErrorCode = ErrorCode.CONSENT_VALIDATION_ERROR):
        super().__init__(message, error_code)