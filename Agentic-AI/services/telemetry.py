"""Audit and telemetry service for monitoring and logging."""

import time
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
from contextlib import contextmanager
from uuid import uuid4
from loguru import logger
from collections import defaultdict, deque
import threading


class TelemetryService:
    """Service for audit logging, metrics collection, and monitoring."""
    
    def __init__(self):
        """Initialize telemetry service."""
        self.metrics = defaultdict(lambda: defaultdict(int))
        self.latency_metrics = defaultdict(list)
        self.audit_logs = deque(maxlen=10000)  # Keep last 10k audit entries
        self.active_requests = {}
        self._lock = threading.Lock()
        
        # Metrics counters
        self.step_counters = defaultdict(int)
        self.success_counters = defaultdict(int)
        self.failure_counters = defaultdict(int)
        self.latency_samples = defaultdict(lambda: deque(maxlen=1000))
        
        logger.info("Telemetry service initialized")
    
    def generate_request_id(self) -> str:
        """Generate unique request ID."""
        return f"req-{uuid4().hex[:12]}-{int(time.time())}"
    
    @contextmanager
    def track_request(self, request_id: str, operation: str, metadata: Optional[Dict[str, Any]] = None):
        """Context manager to track request execution with automatic timing."""
        start_time = time.time()
        
        # Record request start
        self.log_audit_event(
            request_id=request_id,
            event_type="request_start",
            operation=operation,
            metadata=metadata or {}
        )
        
        with self._lock:
            self.active_requests[request_id] = {
                "operation": operation,
                "start_time": start_time,
                "metadata": metadata or {}
            }
        
        try:
            yield request_id
            
            # Record success
            duration = time.time() - start_time
            self.record_success(operation, duration)
            
            self.log_audit_event(
                request_id=request_id,
                event_type="request_success",
                operation=operation,
                duration=duration,
                metadata={"status": "success"}
            )
            
        except Exception as e:
            # Record failure
            duration = time.time() - start_time
            self.record_failure(operation, duration, str(e))
            
            self.log_audit_event(
                request_id=request_id,
                event_type="request_failure",
                operation=operation,
                duration=duration,
                metadata={"status": "failure", "error": str(e)}
            )
            raise
            
        finally:
            with self._lock:
                self.active_requests.pop(request_id, None)
    
    def log_audit_event(self, request_id: str, event_type: str, operation: str, 
                       step: Optional[str] = None, duration: Optional[float] = None,
                       versions: Optional[Dict[str, str]] = None, 
                       metadata: Optional[Dict[str, Any]] = None) -> None:
        """Log structured audit event with log redaction for sensitive data."""
        
        # Redact sensitive information
        safe_metadata = self._redact_sensitive_data(metadata or {})
        
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": request_id,
            "event_type": event_type,
            "operation": operation,
            "step": step,
            "duration": duration,
            "versions": versions or {},
            "metadata": safe_metadata
        }
        
        with self._lock:
            self.audit_logs.append(audit_entry)
        
        # Also log to structured logger
        logger.info(
            f"AUDIT: {event_type}",
            extra={
                "request_id": request_id,
                "operation": operation,
                "step": step,
                "duration": duration,
                "versions": versions,
                "metadata": safe_metadata
            }
        )
    
    def _redact_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Redact sensitive information from log data."""
        sensitive_keys = {
            'password', 'token', 'api_key', 'secret', 'auth', 'credential',
            'ssn', 'social_security', 'credit_card', 'patient_id', 'medical_record'
        }
        
        redacted_data = {}
        for key, value in data.items():
            key_lower = key.lower()
            
            # Check if key contains sensitive information
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                redacted_data[key] = "[REDACTED]"
            elif isinstance(value, dict):
                redacted_data[key] = self._redact_sensitive_data(value)
            elif isinstance(value, str) and len(value) > 100:
                # Truncate very long strings that might contain sensitive data
                redacted_data[key] = value[:100] + "...[TRUNCATED]"
            else:
                redacted_data[key] = value
        
        return redacted_data
    
    def record_step_execution(self, request_id: str, step: str, duration: float,
                            versions: Optional[Dict[str, str]] = None,
                            metadata: Optional[Dict[str, Any]] = None) -> None:
        """Record execution of a processing step."""
        with self._lock:
            self.step_counters[step] += 1
            self.latency_samples[f"step_{step}"].append(duration)
        
        self.log_audit_event(
            request_id=request_id,
            event_type="step_execution",
            operation="processing",
            step=step,
            duration=duration,
            versions=versions,
            metadata=metadata
        )
    
    def record_success(self, operation: str, duration: float) -> None:
        """Record successful operation."""
        with self._lock:
            self.success_counters[operation] += 1
            self.latency_samples[f"operation_{operation}"].append(duration)
    
    def record_failure(self, operation: str, duration: float, error: str) -> None:
        """Record failed operation."""
        with self._lock:
            self.failure_counters[operation] += 1
            self.latency_samples[f"operation_{operation}"].append(duration)
        
        logger.error(f"Operation failed: {operation}", extra={
            "operation": operation,
            "duration": duration,
            "error": error
        })
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics for monitoring endpoint."""
        with self._lock:
            metrics = {
                "timestamp": datetime.utcnow().isoformat(),
                "active_requests": len(self.active_requests),
                "total_audit_entries": len(self.audit_logs),
                "step_counts": dict(self.step_counters),
                "success_counts": dict(self.success_counters),
                "failure_counts": dict(self.failure_counters),
                "success_rates": {},
                "latency_stats": {}
            }
            
            # Calculate success rates
            for operation in set(list(self.success_counters.keys()) + list(self.failure_counters.keys())):
                total = self.success_counters[operation] + self.failure_counters[operation]
                if total > 0:
                    metrics["success_rates"][operation] = self.success_counters[operation] / total
            
            # Calculate latency statistics
            for key, samples in self.latency_samples.items():
                if samples:
                    sorted_samples = sorted(samples)
                    n = len(sorted_samples)
                    metrics["latency_stats"][key] = {
                        "count": n,
                        "min": min(sorted_samples),
                        "max": max(sorted_samples),
                        "mean": sum(sorted_samples) / n,
                        "p50": sorted_samples[n // 2],
                        "p95": sorted_samples[int(n * 0.95)] if n > 0 else 0,
                        "p99": sorted_samples[int(n * 0.99)] if n > 0 else 0
                    }
        
        return metrics
    
    def get_audit_logs(self, request_id: Optional[str] = None, 
                      operation: Optional[str] = None,
                      limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get audit logs with optional filtering."""
        with self._lock:
            logs = list(self.audit_logs)
        
        # Filter by request_id
        if request_id:
            logs = [log for log in logs if log.get("request_id") == request_id]
        
        # Filter by operation
        if operation:
            logs = [log for log in logs if log.get("operation") == operation]
        
        # Sort by timestamp (newest first)
        logs = sorted(logs, key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Apply limit
        if limit:
            logs = logs[:limit]
        
        return logs
    
    def get_active_requests(self) -> Dict[str, Any]:
        """Get information about currently active requests."""
        with self._lock:
            active = {}
            current_time = time.time()
            
            for request_id, info in self.active_requests.items():
                active[request_id] = {
                    "operation": info["operation"],
                    "duration": current_time - info["start_time"],
                    "metadata": info["metadata"]
                }
        
        return active
    
    def clear_metrics(self) -> None:
        """Clear all metrics and audit logs (for testing/maintenance)."""
        with self._lock:
            self.metrics.clear()
            self.latency_metrics.clear()
            self.audit_logs.clear()
            self.active_requests.clear()
            self.step_counters.clear()
            self.success_counters.clear()
            self.failure_counters.clear()
            self.latency_samples.clear()
        
        logger.info("Telemetry metrics cleared")
    
    def export_metrics_prometheus(self) -> str:
        """Export metrics in Prometheus format."""
        metrics = self.get_metrics()
        lines = []
        
        # Add help and type information
        lines.append("# HELP orthopedic_requests_total Total number of requests")
        lines.append("# TYPE orthopedic_requests_total counter")
        
        # Success counters
        for operation, count in metrics["success_counts"].items():
            lines.append(f'orthopedic_requests_total{{operation="{operation}",status="success"}} {count}')
        
        # Failure counters
        for operation, count in metrics["failure_counts"].items():
            lines.append(f'orthopedic_requests_total{{operation="{operation}",status="failure"}} {count}')
        
        # Success rates
        lines.append("# HELP orthopedic_success_rate Success rate by operation")
        lines.append("# TYPE orthopedic_success_rate gauge")
        for operation, rate in metrics["success_rates"].items():
            lines.append(f'orthopedic_success_rate{{operation="{operation}"}} {rate}')
        
        # Latency metrics
        lines.append("# HELP orthopedic_request_duration_seconds Request duration in seconds")
        lines.append("# TYPE orthopedic_request_duration_seconds histogram")
        
        for key, stats in metrics["latency_stats"].items():
            operation = key.replace("operation_", "").replace("step_", "")
            lines.append(f'orthopedic_request_duration_seconds_count{{operation="{operation}"}} {stats["count"]}')
            lines.append(f'orthopedic_request_duration_seconds_sum{{operation="{operation}"}} {stats["mean"] * stats["count"]}')
        
        # Active requests
        lines.append("# HELP orthopedic_active_requests Currently active requests")
        lines.append("# TYPE orthopedic_active_requests gauge")
        lines.append(f'orthopedic_active_requests {metrics["active_requests"]}')
        
        return "\n".join(lines)


# Global telemetry service instance
telemetry_service = TelemetryService()