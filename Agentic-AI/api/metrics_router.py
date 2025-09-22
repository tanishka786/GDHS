"""FastAPI router for metrics and monitoring endpoints."""

from typing import Optional
from fastapi import APIRouter, Query, Response
from fastapi.responses import PlainTextResponse

from api.metrics import (
    get_metrics_json,
    get_metrics_prometheus,
    get_health_status,
    get_audit_logs,
    get_active_requests
)

router = APIRouter(prefix="/metrics")


@router.get("/", summary="Get metrics in JSON format")
async def metrics_json():
    """
    Get system metrics in JSON format.
    
    Returns comprehensive metrics including:
    - Request counts and success rates
    - Latency statistics
    - Active request information
    - Step execution counts
    """
    return get_metrics_json()


@router.get("/prometheus", response_class=PlainTextResponse, summary="Get metrics in Prometheus format")
async def metrics_prometheus():
    """
    Get system metrics in Prometheus format for monitoring systems.
    
    Returns metrics formatted for Prometheus scraping including:
    - Request counters by operation and status
    - Success rate gauges
    - Request duration histograms
    - Active request counts
    """
    return get_metrics_prometheus()


@router.get("/health", summary="Get system health status")
async def health_status():
    """
    Get current system health status.
    
    Returns health assessment based on:
    - Recent failure rates
    - Active request counts
    - Overall system status
    """
    return get_health_status()


@router.get("/audit", summary="Get audit logs")
async def audit_logs(
    request_id: Optional[str] = Query(None, description="Filter by specific request ID"),
    operation: Optional[str] = Query(None, description="Filter by operation type"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return")
):
    """
    Get audit logs with optional filtering.
    
    Parameters:
    - request_id: Filter logs for a specific request
    - operation: Filter logs for a specific operation type
    - limit: Maximum number of logs to return (1-1000)
    
    Returns structured audit logs with timestamps, request IDs, operations, and metadata.
    """
    return get_audit_logs(request_id=request_id, operation=operation, limit=limit)


@router.get("/active", summary="Get active requests")
async def active_requests():
    """
    Get information about currently active requests.
    
    Returns details about requests currently being processed including:
    - Request IDs and operations
    - Current duration
    - Request metadata
    """
    return get_active_requests()