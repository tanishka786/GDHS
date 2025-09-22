"""Health check endpoint for the orthopedic assistant MCP server."""

from fastapi import APIRouter
from typing import Dict, Any
from loguru import logger

from app.mcp.server import mcp_server
from app.config import config

router = APIRouter()


@router.get("/healthz")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint returning tool registration summary.
    
    Returns server status, tool count, and configuration summary.
    """
    try:
        # Ensure MCP server is initialized
        if not mcp_server._initialized:
            await mcp_server.initialize()
        
        # Get tool registration summary
        tools_info = await mcp_server.list_tools()
        resources_info = await mcp_server.list_resources()
        
        health_status = {
            "status": "healthy",
            "timestamp": None,  # Will be set by FastAPI
            "server_info": {
                "name": "orthopedic-assistant-mcp",
                "version": "0.1.0",
                "description": "Specialized orthopedic medical assistance MCP server"
            },
            "mcp_status": {
                "initialized": mcp_server._initialized,
                "tools_count": len(tools_info.get("tools", [])),
                "resources_count": len(resources_info.get("resources", [])),
                "registered_tools": [tool["name"] for tool in tools_info.get("tools", [])],
                "registered_resources": [res["name"] for res in resources_info.get("resources", [])]
            },
            "configuration": {
                "groq_configured": bool(config.groq_api_key and config.groq_api_key != "your_groq_api_key_here"),
                "storage_type": config.storage_type,
                "medical_disclaimer_enabled": config.medical_disclaimer_enabled,
                "phi_redaction_enabled": config.phi_redaction_enabled,
                "metrics_enabled": config.metrics_enabled,
                "audit_logging_enabled": config.audit_logging_enabled
            },
            "thresholds": {
                "router_threshold": config.router_threshold,
                "detector_score_min": config.detector_score_min,
                "nms_iou": config.nms_iou
            },
            "timeouts": {
                "route_timeout": config.route_timeout,
                "detect_timeout": config.detect_timeout,
                "triage_timeout": config.triage_timeout,
                "diagnosis_timeout": config.diagnosis_timeout,
                "report_timeout": config.report_timeout
            }
        }
        
        logger.info("Health check completed successfully")
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "server_info": {
                "name": "orthopedic-assistant-mcp",
                "version": "0.1.0"
            }
        }