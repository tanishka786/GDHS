"""Metrics endpoint for monitoring and observability."""

from typing import Dict, Any
from services.telemetry import telemetry_service


def get_metrics_json() -> Dict[str, Any]:
    """Get metrics in JSON format."""
    return telemetry_service.get_metrics()


def get_metrics_prometheus() -> str:
    """Get metrics in Prometheus format."""
    return telemetry_service.export_metrics_prometheus()


def get_health_status() -> Dict[str, Any]:
    """Get health status of the service."""
    metrics = telemetry_service.get_metrics()
    
    # Determine health based on recent failures
    total_requests = sum(metrics["success_counts"].values()) + sum(metrics["failure_counts"].values())
    total_failures = sum(metrics["failure_counts"].values())
    
    if total_requests == 0:
        status = "healthy"
        message = "No requests processed yet"
    elif total_failures / total_requests > 0.1:  # More than 10% failure rate
        status = "unhealthy"
        message = f"High failure rate: {total_failures}/{total_requests}"
    else:
        status = "healthy"
        message = f"Operating normally: {total_failures}/{total_requests} failures"
    
    return {
        "status": status,
        "message": message,
        "timestamp": metrics["timestamp"],
        "active_requests": metrics["active_requests"],
        "total_requests": total_requests,
        "total_failures": total_failures
    }


def get_audit_logs(request_id: str = None, operation: str = None, limit: int = 100) -> Dict[str, Any]:
    """Get audit logs with filtering."""
    logs = telemetry_service.get_audit_logs(
        request_id=request_id,
        operation=operation,
        limit=limit
    )
    
    return {
        "logs": logs,
        "count": len(logs),
        "filters": {
            "request_id": request_id,
            "operation": operation,
            "limit": limit
        }
    }


def get_active_requests() -> Dict[str, Any]:
    """Get currently active requests."""
    active = telemetry_service.get_active_requests()
    
    return {
        "active_requests": active,
        "count": len(active)
    }