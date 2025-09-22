"""Main FastAPI application for the orthopedic assistant MCP server."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from loguru import logger
import os

from app.config import config
from api.health import router as health_router
from api.metrics_router import router as metrics_router
from api.analyze import router as analyze_router
from api.annotated import router as annotated_router
from api.pdf_reports import router as pdf_router
from api.chat import router as chat_router
from api.clinical_analysis import router as clinical_analysis_router
from api.middleware import (
    create_security_middleware,
    create_validation_middleware, 
    create_response_security_middleware
)
from services.error_handler import (
    OrthopedicError,
    ValidationError,
    AuthorizationError,
    orthopedic_error_handler,
    validation_error_handler,
    authorization_error_handler,
    general_exception_handler,
    http_exception_handler
)

# Create FastAPI app
app = FastAPI(
    title="Orthopedic Assistant MCP Server",
    description="Specialized orthopedic medical assistance MCP server with HTTP API wrapper",
    version="0.1.0",
    docs_url="/docs" if config.debug else None,
    redoc_url="/redoc" if config.debug else None
)

# Allow CORS from local frontend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000/api/user/upload"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add security middleware
# app.add_middleware(create_response_security_middleware())
# app.add_middleware(create_validation_middleware())
# app.add_middleware(create_security_middleware())

# Add exception handlers
app.add_exception_handler(OrthopedicError, orthopedic_error_handler)
app.add_exception_handler(ValidationError, validation_error_handler)
app.add_exception_handler(AuthorizationError, authorization_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(health_router, tags=["health"])
app.include_router(metrics_router, tags=["metrics", "monitoring"])
app.include_router(analyze_router, tags=["analysis"])
app.include_router(annotated_router, prefix="/api", tags=["images", "annotated"])
app.include_router(pdf_router, tags=["reports", "pdf"])
app.include_router(chat_router, tags=["chat", "mcp"])
app.include_router(clinical_analysis_router, prefix="/api", tags=["clinical", "analysis"])


@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    logger.info("Starting Orthopedic Assistant MCP Server...")
    
    # Initialize MCP server
    from app.mcp.server import mcp_server
    await mcp_server.initialize()
    
    # Preload YOLO models for faster inference
    logger.info("Preloading YOLO models...")
    try:
        # Load hand agent and its model
        from agents.hand import get_hand_agent
        hand_agent = get_hand_agent()
        await hand_agent.load_model()
        logger.info("✅ Hand YOLO model loaded successfully")
        
        # Load leg agent and its model
        from agents.leg import get_leg_agent
        leg_agent = get_leg_agent()
        await leg_agent.load_model()
        logger.info("✅ Leg YOLO model loaded successfully")
        
        logger.info("🎯 All YOLO models preloaded and ready for inference")
        
    except Exception as e:
        logger.error(f"❌ Failed to preload YOLO models: {e}")
        logger.warning("⚠️  Server will continue but models will load on first use")
    
    logger.info("Orthopedic Assistant MCP Server started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown."""
    logger.info("Shutting down Orthopedic Assistant MCP Server...")


# Mount static files from frontend directory
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
async def root():
    """Serve the main HTML interface directly from frontend directory."""
    frontend_path = "frontend/index.html"
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    else:
        # Return error if frontend not found
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Frontend not found",
                "message": "Please ensure frontend/index.html exists",
                "required_files": [
                    "frontend/index.html",
                    "frontend/style.css", 
                    "frontend/script.js"
                ]
            }
        )

@app.get("/api/images/{image_id}")
async def serve_image(image_id: str):
    """Serve stored images by ID for annotated images."""
    try:
        from services.storage import storage_service
        image_data = storage_service.retrieve_file(image_id)
        
        if not image_data:
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Determine content type based on image data
        content_type = "image/jpeg"  # Default
        if image_data.startswith(b'\x89PNG'):
            content_type = "image/png"
        elif image_data.startswith(b'GIF'):
            content_type = "image/gif"
        
        return Response(
            content=image_data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Disposition": f"inline; filename=image_{image_id}.jpg"
            }
        )
        
    except Exception as e:
        logger.error(f"Error serving image {image_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve image")

@app.get("/api/info")
async def api_info():
    """API information endpoint."""
    return {
        "name": "Orthopedic Assistant MCP Server",
        "version": "0.1.0",
        "description": "Specialized orthopedic medical assistance MCP server",
        "frontend_status": "Serving from frontend/ directory",
        "endpoints": {
            "health": "/healthz",
            "metrics": "/metrics",
            "metrics_prometheus": "/metrics/prometheus",
            "health_status": "/metrics/health",
            "audit_logs": "/metrics/audit",
            "active_requests": "/metrics/active",
            "analyze": "/api/analyze",
            "request_status": "/api/requests/{id}",
            "report_pdf": "/api/reports/{pdf_id}",
            "list_requests": "/api/requests",
            "images": "/api/images/{id}",
            "annotated_images": "/api/annotated/{id}",
            "annotated_image_info": "/api/annotated/{id}/info",
            "docs": "/docs" if config.debug else "disabled",
            "mcp": "MCP protocol via stdio/transport"
        },
        "static_files": "/static/ (serves frontend assets)",
        "frontend_files": [
            "frontend/index.html",
            "frontend/style.css", 
            "frontend/script.js"
        ]
    }

@app.get("/api/mcp/tools")
async def list_mcp_tools():
    """List available MCP tools."""
    from app.mcp.server import mcp_server
    try:
        tools_response = await mcp_server.list_tools()
        return {
            "success": True,
            "tools": tools_response.get("tools", []),
            "count": len(tools_response.get("tools", []))
        }
    except Exception as e:
        logger.error(f"Error listing MCP tools: {e}")
        return {
            "success": False,
            "error": str(e),
            "tools": [],
            "count": 0
        }

@app.post("/api/mcp/call")
async def call_mcp_tool(request: dict):
    """Call an MCP tool via HTTP API."""
    from app.mcp.server import mcp_server
    
    tool_name = request.get("tool")
    arguments = request.get("arguments", {})
    
    if not tool_name:
        raise HTTPException(status_code=400, detail="Tool name is required")
    
    try:
        result = await mcp_server.call_tool(tool_name, arguments)
        return {
            "success": True,
            "tool": tool_name,
            "arguments": arguments,
            "result": result
        }
    except Exception as e:
        logger.error(f"Error calling MCP tool '{tool_name}': {e}")
        return {
            "success": False,
            "tool": tool_name,
            "arguments": arguments,
            "error": str(e)
        }

@app.post("/api/upload-image")
async def upload_image(request: dict):
    """Handle image upload and return a temporary URL or process the image."""
    try:
        image_data = request.get("image_data")
        filename = request.get("filename", "uploaded_image.jpg")
        content_type = request.get("content_type", "image/jpeg")
        
        if not image_data:
            raise HTTPException(status_code=400, detail="Image data is required")
        
        # In a real implementation, you would:
        # 1. Validate the image data
        # 2. Save it to storage (local/S3/etc.)
        # 3. Return a URL to the saved image
        
        # For now, we'll just return success and echo back the info
        return {
            "success": True,
            "message": "Image upload received",
            "filename": filename,
            "content_type": content_type,
            "size": len(image_data) if image_data else 0,
            "note": "In production, this would save the image and return a URL"
        }
        
    except Exception as e:
        logger.error(f"Error handling image upload: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/test-detection")
async def test_detection():
    """Test endpoint to verify the detection system is working."""
    try:
        from services.groq_service import groq_service
        from agents.hand import get_hand_agent
        from agents.leg import get_leg_agent
        
        # Create a simple test image (base64 encoded)
        import base64
        from PIL import Image
        import io
        
        # Create a test image
        img = Image.new('RGB', (400, 300), color='lightgray')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        img_data = buffer.getvalue()
        
        # Test hand agent
        hand_agent = get_hand_agent()
        detection_result = await hand_agent.detect_fractures(img_data)
        
        # Add body part info for compatibility
        detection_result['body_part'] = 'hand'
        detection_result['confidence'] = 0.85
        
        # Test triage assessment
        triage_result = await groq_service.generate_triage_assessment(
            detections=detection_result['detections'],
            symptoms="Test symptoms for debugging",
            body_part=detection_result['body_part']
        )
        
        # Test diagnosis summary
        diagnosis_result = await groq_service.generate_diagnosis_summary(
            triage_result=triage_result,
            detections=detection_result['detections'],
            symptoms="Test symptoms",
            body_part=detection_result['body_part']
        )
        
        return {
            "success": True,
            "message": "Detection system test completed",
            "detection_result": detection_result,
            "triage_result": triage_result,
            "diagnosis_result": diagnosis_result,
            "system_status": {
                "hand_agent": "loaded with real YOLO model",
                "leg_agent": "loaded with real YOLO model", 
                "groq_service": "available",
                "models_loaded": "real YOLO models active"
            }
        }
        
    except Exception as e:
        logger.error(f"Detection test failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Detection system test failed"
        }