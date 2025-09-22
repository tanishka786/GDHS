"""Security and validation middleware for the orthopedic assistant API."""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from loguru import logger

from services.security import request_validator, DataSanitizer
from services.error_handler import ErrorCode, ValidationError, error_handler


class SecurityMiddleware:
    """Middleware for request security, validation, and sanitization."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Create request object
        request = Request(scope, receive)
        
        # Generate request ID for tracking
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Add request ID to response headers
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = dict(message.get("headers", []))
                headers[b"x-request-id"] = request_id.encode()
                message["headers"] = list(headers.items())
            await send(message)
        
        try:
            # Apply security checks
            await self._apply_security_checks(request)
            
            # Continue with the request
            await self.app(scope, receive, send_wrapper)
            
        except ValidationError as e:
            # Handle validation errors
            response_data = error_handler.create_error_response(e, request_id)
            response = JSONResponse(
                status_code=e.http_status,
                content=response_data
            )
            await response(scope, receive, send_wrapper)
        
        except Exception as e:
            # Handle unexpected errors
            logger.error(f"Middleware error for request {request_id}: {e}")
            response_data = error_handler.create_error_response(e, request_id)
            response = JSONResponse(
                status_code=500,
                content=response_data
            )
            await response(scope, receive, send_wrapper)
    
    async def _apply_security_checks(self, request: Request):
        """Apply security checks to the request."""
        
        # Get client identifier for rate limiting
        client_id = self._get_client_id(request)
        
        # Determine endpoint for rate limiting
        endpoint = self._get_endpoint_type(request.url.path)
        
        # Check rate limits
        if not request_validator.check_rate_limit(client_id, endpoint):
            raise ValidationError(
                "Rate limit exceeded. Please try again later.",
                ErrorCode.RATE_LIMIT_EXCEEDED,
                {"retry_after_seconds": 60}
            )
        
        # Log request (with sanitization)
        self._log_request(request)
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting."""
        # Use X-Forwarded-For if available (behind proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Fall back to direct client IP
        client_host = request.client.host if request.client else "unknown"
        return client_host
    
    def _get_endpoint_type(self, path: str) -> str:
        """Determine endpoint type for rate limiting."""
        if "/analyze" in path:
            return "analyze"
        elif "/reports/" in path:
            return "reports"
        elif "/requests/" in path:
            return "status"
        else:
            return "general"
    
    def _log_request(self, request: Request):
        """Log request with sanitization."""
        log_data = {
            "request_id": request.state.request_id,
            "method": request.method,
            "path": request.url.path,
            "client_ip": self._get_client_id(request),
            "user_agent": request.headers.get("user-agent", "unknown")[:200],  # Limit length
            "timestamp": time.time()
        }
        
        # Sanitize log data
        sanitized_log_data = DataSanitizer.sanitize_for_logging(log_data)
        
        logger.info("Request received", **sanitized_log_data)


class RequestValidationMiddleware:
    """Middleware specifically for request validation and sanitization."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Only validate specific endpoints that handle sensitive data
        if self._should_validate_request(request):
            try:
                await self._validate_request_body(request)
            except ValidationError as e:
                request_id = getattr(request.state, 'request_id', 'unknown')
                response_data = error_handler.create_error_response(e, request_id)
                response = JSONResponse(
                    status_code=e.http_status,
                    content=response_data
                )
                await response(scope, receive, send)
                return
        
        await self.app(scope, receive, send)
    
    def _should_validate_request(self, request: Request) -> bool:
        """Determine if request should be validated."""
        # Validate POST requests to sensitive endpoints
        if request.method == "POST" and "/analyze" in request.url.path:
            return True
        return False
    
    async def _validate_request_body(self, request: Request):
        """Validate request body for security issues."""
        try:
            # Check content type
            content_type = request.headers.get("content-type", "")
            if not content_type.startswith("application/json"):
                raise ValidationError(
                    "Content-Type must be application/json",
                    ErrorCode.INVALID_REQUEST_FORMAT
                )
            
            # Check content length
            content_length = request.headers.get("content-length")
            if content_length:
                length = int(content_length)
                if length > 10 * 1024 * 1024:  # 10MB limit
                    raise ValidationError(
                        "Request body too large",
                        ErrorCode.INVALID_REQUEST_FORMAT
                    )
            
        except ValueError as e:
            raise ValidationError(
                f"Invalid request format: {str(e)}",
                ErrorCode.INVALID_REQUEST_FORMAT
            )


class ResponseSecurityMiddleware:
    """Middleware for securing responses."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Add security headers
                headers = dict(message.get("headers", []))
                
                # Security headers
                headers[b"x-content-type-options"] = b"nosniff"
                headers[b"x-frame-options"] = b"DENY"
                headers[b"x-xss-protection"] = b"1; mode=block"
                headers[b"strict-transport-security"] = b"max-age=31536000; includeSubDomains"
                headers[b"referrer-policy"] = b"strict-origin-when-cross-origin"
                
                # Remove server information
                if b"server" in headers:
                    del headers[b"server"]
                
                message["headers"] = list(headers.items())
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)


# Middleware factory functions

def create_security_middleware():
    """Create security middleware with default configuration."""
    return SecurityMiddleware


def create_validation_middleware():
    """Create request validation middleware."""
    return RequestValidationMiddleware


def create_response_security_middleware():
    """Create response security middleware."""
    return ResponseSecurityMiddleware