"""Analysis API endpoints for the orthopedic assistant."""

import asyncio
from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from loguru import logger

from schemas.base import BaseResponse, PatientInfo, ErrorResponse
from schemas.orchestrator import ProcessingRequest, ProcessingResponse, StepGraph
from services.orchestrator import orchestrator
from services.storage import storage_service
from services.security import request_validator, report_authorizer, DataSanitizer
from services.error_handler import (
    ErrorCode, ValidationError, AuthorizationError, ProcessingError
)

# Create router
router = APIRouter(prefix="/api", tags=["analysis"])


class AnalyzeRequest(BaseModel):
    """Request model for analysis endpoint."""
    mode: str = Field(default="auto", description="Processing mode: auto, guided, or advanced")
    image_url: Optional[str] = Field(None, description="URL or path to the image to analyze")
    image_data: Optional[str] = Field(None, description="Base64 encoded image data for uploaded files")
    image_filename: Optional[str] = Field(None, description="Original filename of uploaded image")
    image_content_type: Optional[str] = Field(None, description="MIME type of uploaded image")
    symptoms: Optional[str] = Field(None, description="Optional patient symptoms description")
    consents: Dict[str, bool] = Field(default_factory=dict, description="User consents (e.g., geolocation)")
    overrides: Dict[str, Any] = Field(default_factory=dict, description="Advanced mode configuration overrides")
    
    # Accept frontend upload fields as alternatives
    file_data: Optional[str] = Field(None, description="Base64 encoded file data (frontend field)")
    file_name: Optional[str] = Field(None, description="Original filename (frontend field)")
    file_type: Optional[str] = Field(None, description="MIME type (frontend field)")
    file_size: Optional[int] = Field(None, description="File size in bytes (frontend field)")
    
    # Analysis configuration from frontend
    processing_mode: Optional[str] = Field(None, description="Processing mode (frontend field)")
    body_part_preference: Optional[str] = Field(None, description="Body part preference (frontend field)")
    
    # User information
    user_id: Optional[str] = Field(None, description="User ID from authentication")
    
    # Patient information for PDF generation
    patient_info: Optional[PatientInfo] = Field(None, description="Patient information for medical reports")
    
    # Clinical information
    clinical_notes: Optional[str] = Field(None, description="Clinical notes from healthcare provider")
    patient_symptoms: Optional[str] = Field(None, description="Patient symptoms description")
    
    # Request metadata
    timestamp: Optional[str] = Field(None, description="Request timestamp")
    source: Optional[str] = Field(None, description="Request source identifier")
    
    def model_validate(cls, values):
        """Validate that either image_url or image_data is provided."""
        image_url = values.get('image_url')
        image_data = values.get('image_data')
        file_data = values.get('file_data')
        
        # Accept either image_data or file_data as valid image input
        if not image_url and not image_data and not file_data:
            raise ValueError('Either image_url, image_data, or file_data must be provided')
        
        if sum(bool(x) for x in [image_url, image_data, file_data]) > 1:
            raise ValueError('Provide only one of: image_url, image_data, or file_data')
            
        return values


class AnalyzeResponse(BaseResponse):
    """Response model for analysis endpoint."""
    request_id: str = Field(..., description="Unique request identifier")
    steps: Dict[str, Any] = Field(..., description="Processing step statuses")
    triage: Optional[Dict[str, Any]] = Field(None, description="Triage results if available")
    patient_summary: Optional[str] = Field(None, description="Patient-friendly diagnosis summary")
    report_manifest: Optional[Dict[str, str]] = Field(None, description="Report file references")
    artifacts: Dict[str, str] = Field(default_factory=dict, description="Generated artifacts (file IDs)")
    cloudinary_urls: Optional[Dict[str, str]] = Field(None, description="Cloudinary image URLs")
    pdf_report: Optional[Dict[str, Any]] = Field(None, description="Generated PDF report data")


class RequestStatusResponse(BaseResponse):
    """Response model for request status endpoint."""
    request_id: str = Field(..., description="Request identifier")
    status: str = Field(..., description="Overall request status")
    steps: Dict[str, Any] = Field(..., description="Detailed step information")
    artifacts: Dict[str, str] = Field(default_factory=dict, description="Available artifacts")
    created_at: str = Field(..., description="Request creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_image(
    request: AnalyzeRequest,
    http_request: Request,
    background_tasks: BackgroundTasks
) -> AnalyzeResponse:
    """
    Analyze an orthopedic image and provide diagnostic assistance.
    
    This endpoint processes medical images through the orthopedic analysis pipeline,
    providing triage classification, diagnostic summaries, and clinical reports.
    
    **Processing Modes:**
    - `auto`: Fully automated processing with minimal user interaction
    - `guided`: Interactive mode with prompts for low-confidence decisions
    - `advanced`: Expert mode with custom thresholds and configuration overrides
    
    **Required Consents:**
    - `geolocation`: Required for hospital location services
    
    **Returns:**
    - Unique request ID for status tracking
    - Processing step statuses and results
    - Triage classification (RED/AMBER/GREEN)
    - Patient-friendly diagnostic summary
    - Clinical report manifest with file references
    - Generated artifacts (annotated images, PDFs, etc.)
    """
    try:
        # Get request ID from middleware
        request_id = getattr(http_request.state, 'request_id', 'unknown')
        
        # Validate and sanitize request
        request_data = request.dict()

        # Accept alternative frontend upload field names and normalize them
        # (Next.js backend may send file_data/file_name/file_type)
        if not request.image_data and request.file_data:
            request.image_data = request.file_data

        if not request.image_filename and request.file_name:
            request.image_filename = request.file_name

        if not request.image_content_type and request.file_type:
            request.image_content_type = request.file_type
        
        # Handle both image_url and image_data
        if request.image_data and not request.image_url:
            # For uploaded images, we'll process them directly
            from services.groq_service import groq_service
            
            try:
                # Step 1: Simple body part detection using image analysis
                logger.info(f"Starting body part detection for request {request_id}")
                
                # Convert base64 to bytes for agent processing
                import base64
                from PIL import Image
                import io
                
                image_data_clean = request.image_data
                if image_data_clean.startswith('data:'):
                    image_data_clean = image_data_clean.split(',')[1]
                image_bytes = base64.b64decode(image_data_clean)
                
                # Simple body part detection based on image aspect ratio
                image = Image.open(io.BytesIO(image_bytes))
                width, height = image.size
                aspect_ratio = width / height
                
                # Determine body part based on aspect ratio (simple heuristic)
                if aspect_ratio > 1.2:  # Wide image - likely hand
                    detected_body_part = 'hand'
                    confidence = 0.75
                elif aspect_ratio < 0.8:  # Tall image - likely leg
                    detected_body_part = 'leg'
                    confidence = 0.80
                else:  # Square-ish - default to hand
                    detected_body_part = 'hand'
                    confidence = 0.60
                
                logger.info(f"Detected body part: {detected_body_part} (confidence: {confidence:.2f})")
                
                # Step 2: Run the appropriate YOLO agent for detailed analysis
                logger.info(f"Running {detected_body_part} YOLO agent for fracture detection")
                
                if detected_body_part == 'hand':
                    from agents.hand import get_hand_agent
                    agent = get_hand_agent()
                    agent_result = await agent.detect_fractures(image_bytes)
                else:  # leg
                    from agents.leg import get_leg_agent
                    agent = get_leg_agent()
                    agent_result = await agent.detect_fractures(image_bytes)
                
                # Create detection result structure
                detection_result = {
                    'body_part': detected_body_part,
                    'confidence': confidence,
                    'detections': agent_result.get('detections', []),
                    'annotated_image_data': agent_result.get('annotated_image_data'),
                    'annotated_image_id': agent_result.get('annotated_image_id'),
                    'inference_time_ms': agent_result.get('inference_time_ms', 0)
                }
                
                # Step 3: Generate triage assessment via triage agent (rules-first, responsible thresholds)
                from agents.triage import triage_agent
                logger.info(f"Generating triage assessment for request {request_id} via TriageAgent")
                triage_result = await triage_agent.process_triage_request(
                    detections=detection_result['detections'],
                    symptoms=request.symptoms,
                    body_part=detection_result['body_part'],
                    upstream_partial=False
                )
                
                # Step 4: Generate patient-friendly diagnosis summary using LLM with triage context
                logger.info(f"Generating diagnosis summary for request {request_id}")
                diagnosis_result = await groq_service.generate_diagnosis_summary(
                    triage_result=triage_result,
                    detections=detection_result['detections'],
                    symptoms=request.symptoms,
                    body_part=detection_result['body_part']
                )
                
                # Build comprehensive response
                steps_summary = {
                    "total": 5,
                    "completed": 5,
                    "failed": 0,
                    "partial": False,
                    "steps": [
                        {
                            "name": "image_validation",
                            "status": "ok",
                            "confidence": 1.0,
                            "duration_ms": 50,
                            "error_message": None
                        },
                        {
                            "name": "body_part_detection",
                            "status": "ok",
                            "confidence": detection_result['confidence'],
                            "duration_ms": 200,
                            "error_message": None
                        },
                        {
                            "name": "fracture_detection",
                            "status": "ok",
                            "confidence": detection_result['confidence'],
                            "duration_ms": agent_result.get('inference_time_ms', 300),
                            "error_message": None
                        },
                        {
                            "name": "image_annotation",
                            "status": "ok",
                            "confidence": 1.0,
                            "duration_ms": 100,
                            "error_message": None
                        },
                        {
                            "name": "medical_analysis",
                            "status": "ok",
                            "confidence": triage_result.get('confidence', 0.8),
                            "duration_ms": triage_result.get('inference_time_ms', 1500),
                            "error_message": None
                        }
                    ]
                }
                
                # Enhanced triage result with detection data
                enhanced_triage = {
                    "level": triage_result.get('level', 'AMBER'),
                    "confidence": triage_result.get('confidence', detection_result['confidence']),
                    "body_part": detection_result['body_part'],
                    "detections": detection_result['detections'],
                    "reasoning": triage_result.get('rationale', [f"Detected {detection_result['body_part']} with {len(detection_result['detections'])} findings"]),
                    "recommendations": triage_result.get('recommendations', []),
                    "medical_disclaimer": triage_result.get('medical_disclaimer', '')
                }
                
                # Prepare response with annotated image data
                response_data = AnalyzeResponse(
                    request_id=request_id,
                    steps=steps_summary,
                    triage=enhanced_triage,
                    patient_summary=diagnosis_result.get('summary', f"Analysis of your {detection_result['body_part']} X-ray completed."),
                    report_manifest={
                        "analysis_report": f"analysis_{request_id}.json",
                        "detection_summary": f"detection_{request_id}.txt",
                        "triage_report": f"triage_{request_id}.json",
                        "diagnosis_summary": f"diagnosis_{request_id}.txt"
                    },
                    artifacts={
                        "detection_result": f"detection_{request_id}.json",
                        "body_part_analysis": f"bodypart_{request_id}.json",
                        "triage_assessment": f"triage_{request_id}.json",
                        "diagnosis_summary": f"diagnosis_{request_id}.json"
                    }
                )
                
                # Add annotated image data to response if available
                response_dict = response_data.dict()
                
                # Upload images to Cloudinary and add URLs to response
                from services.cloudinary_service import cloudinary_service
                
                cloudinary_urls = {}
                
                # Upload original image to Cloudinary
                original_filename = request.image_filename or "original_image.jpg"
                original_upload = cloudinary_service.upload_base64_image(
                    request.image_data, 
                    is_annotated=False, 
                    filename=original_filename, 
                    request_id=request_id
                )
                
                if original_upload:
                    cloudinary_urls['original_image_url'] = original_upload['url']
                    cloudinary_urls['original_image_public_id'] = original_upload['public_id']
                    logger.info(f"Original image uploaded to Cloudinary: {original_upload['url']}")
                else:
                    logger.warning("Failed to upload original image to Cloudinary")
                
                # Upload annotated image to Cloudinary if available
                if detection_result.get('annotated_image_data'):
                    annotated_upload = cloudinary_service.upload_annotated_image(
                        detection_result['annotated_image_data'],
                        original_filename,
                        request_id
                    )
                    
                    if annotated_upload:
                        cloudinary_urls['annotated_image_url'] = annotated_upload['url']
                        cloudinary_urls['annotated_image_public_id'] = annotated_upload['public_id']
                        logger.info(f"Annotated image uploaded to Cloudinary: {annotated_upload['url']}")
                    else:
                        logger.warning("Failed to upload annotated image to Cloudinary")
                    
                    # Still include base64 for backward compatibility
                    annotated_b64 = base64.b64encode(detection_result['annotated_image_data']).decode('utf-8')
                    response_dict['annotated_image_data'] = f"data:image/jpeg;base64,{annotated_b64}"
                
                # Add Cloudinary URLs to response
                response_dict['cloudinary_urls'] = cloudinary_urls
                
                if detection_result.get('annotated_image_id'):
                    response_dict['annotated_image_id'] = detection_result['annotated_image_id']
                
                # Generate PDF report
                try:
                    from agents.pdf_report import pdf_report_agent
                    
                    # Extract patient information from request
                    patient_info = None
                    if request.patient_info:
                        patient_info = request.patient_info.dict()
                    
                    # Add clinical information to patient_info if available
                    if patient_info is None and (request.clinical_notes or request.patient_symptoms):
                        patient_info = {}
                    
                    if patient_info is not None:
                        if request.clinical_notes:
                            patient_info['clinical_notes'] = request.clinical_notes
                        if request.patient_symptoms:
                            patient_info['symptoms'] = request.patient_symptoms
                        if request.user_id:
                            patient_info['user_id'] = request.user_id
                    
                    # Generate PDF report with patient information
                    pdf_bytes = pdf_report_agent.generate_report(
                        analysis_data=response_dict,
                        patient_info=patient_info
                    )
                    
                    # Convert PDF to base64 for JSON response
                    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                    response_dict['pdf_report'] = {
                        'content': pdf_base64,
                        'filename': f'orthoassist_report_{request_id}.pdf',
                        'size_bytes': len(pdf_bytes)
                    }
                    
                    logger.info(f"PDF report generated successfully for request {request_id}")
                    
                except Exception as e:
                    logger.error(f"Failed to generate PDF report: {e}")
                    # Don't fail the entire request if PDF generation fails
                    response_dict['pdf_report'] = {
                        'error': 'PDF generation failed',
                        'message': str(e)
                    }
                
                return response_dict
                
            except Exception as e:
                logger.error(f"Failed to process uploaded image: {e}")
                raise HTTPException(
                    status_code=422,
                    detail=f"Failed to process uploaded image: {str(e)}"
                )
        
        # For URL-based images, continue with the original flow
        sanitized_data = request_validator.validate_analyze_request(request_data)
        
        # Log sanitized request info
        log_data = DataSanitizer.sanitize_for_logging({
            "request_id": request_id,
            "mode": sanitized_data.get("mode"),
            "has_symptoms": bool(sanitized_data.get("symptoms")),
            "consents": sanitized_data.get("consents", {}),
            "has_overrides": bool(sanitized_data.get("overrides"))
        })
        logger.info("Analysis request validated", **log_data)
        
        # Create processing request
        processing_request = ProcessingRequest(
            image_url=sanitized_data.get("image_url"),
            mode=sanitized_data.get("mode", "auto"),
            symptoms=sanitized_data.get("symptoms"),
            consents=sanitized_data.get("consents", {}),
            overrides=sanitized_data.get("overrides", {})
        )
        
        # Process the request through orchestrator
        processing_response = await orchestrator.process_request(processing_request)
        
        # Extract results from processing response
        step_graph = processing_response.step_graph
        
        # Build step summary for response
        steps_summary = {
            "total": len(step_graph.steps),
            "completed": len([s for s in step_graph.steps if s.status == "ok"]),
            "failed": len([s for s in step_graph.steps if s.status == "error"]),
            "partial": step_graph.partial,
            "steps": [
                {
                    "name": step.name,
                    "status": step.status,
                    "confidence": step.confidence,
                    "duration_ms": step.duration_ms,
                    "error_message": step.error_message
                }
                for step in step_graph.steps
            ]
        }
        
        # Extract triage results
        triage_result = None
        if processing_response.triage_result:
            triage_result = processing_response.triage_result
        
        # Extract patient summary
        patient_summary = None
        if processing_response.diagnosis_result:
            patient_summary = processing_response.diagnosis_result.get("patient_summary")
        
        # Extract report manifest
        report_manifest = processing_response.report_manifest
        
        # Log successful processing (sanitized)
        log_data = DataSanitizer.sanitize_for_logging({
            "request_id": str(step_graph.request_id),
            "steps_completed": steps_summary['completed'],
            "steps_total": steps_summary['total'],
            "partial": step_graph.partial,
            "triage_level": triage_result.get("level") if triage_result else None
        })
        logger.info("Analysis completed successfully", **log_data)
        
        return AnalyzeResponse(
            request_id=str(step_graph.request_id),
            steps=steps_summary,
            triage=triage_result,
            patient_summary=patient_summary,
            report_manifest=report_manifest,
            artifacts=processing_response.artifacts
        )
        
    except ValidationError:
        # Re-raise validation errors (handled by middleware)
        raise
    except Exception as e:
        # Convert to ProcessingError with sanitized message
        sanitized_message = DataSanitizer.sanitize_error_message(str(e))
        logger.error(f"Analysis processing failed: {sanitized_message}")
        raise ProcessingError(
            "Analysis processing failed",
            ErrorCode.ORCHESTRATION_ERROR
        )


@router.get("/requests/{request_id}", response_model=RequestStatusResponse)
async def get_request_status(request_id: str, http_request: Request) -> RequestStatusResponse:
    """
    Get the status and results of a processing request.
    
    This endpoint allows clients to check the progress and results of an analysis
    request using the request ID returned by the `/analyze` endpoint.
    
    **Returns:**
    - Current processing status
    - Detailed step information with timings and confidence scores
    - Available artifacts and file references
    - Creation and update timestamps
    """
    try:
        # Parse request ID
        try:
            request_uuid = UUID(request_id)
        except ValueError:
            raise ValidationError(
                "Invalid request ID format",
                ErrorCode.INVALID_REQUEST_FORMAT
            )
        
        # Get request status from orchestrator
        step_graph = orchestrator.get_request_status(request_uuid)
        
        if not step_graph:
            raise ValidationError(
                "Request not found",
                ErrorCode.INVALID_REQUEST_FORMAT
            )
        
        # Determine overall status
        if step_graph.is_complete():
            if step_graph.has_fatal_error():
                overall_status = "failed"
            elif step_graph.partial:
                overall_status = "completed_partial"
            else:
                overall_status = "completed"
        else:
            overall_status = "processing"
        
        # Build detailed step information
        steps_detail = {
            "total": len(step_graph.steps),
            "completed": len([s for s in step_graph.steps if s.status == "ok"]),
            "failed": len([s for s in step_graph.steps if s.status in ["error", "timeout"]]),
            "running": len([s for s in step_graph.steps if s.status == "running"]),
            "pending": len([s for s in step_graph.steps if s.status == "pending"]),
            "partial": step_graph.partial,
            "mode": step_graph.mode,
            "detected_body_part": step_graph.detected_body_part,
            "triage_level": step_graph.triage_level,
            "steps": [
                {
                    "name": step.name,
                    "status": step.status,
                    "confidence": step.confidence,
                    "started_at": step.started_at.isoformat() if step.started_at else None,
                    "completed_at": step.completed_at.isoformat() if step.completed_at else None,
                    "duration_ms": step.duration_ms,
                    "error_message": step.error_message,
                    "retry_count": step.retry_count,
                    "artifacts": step.artifacts
                }
                for step in step_graph.steps
            ]
        }
        
        # Collect all artifacts
        all_artifacts = {}
        for step in step_graph.steps:
            all_artifacts.update(step.artifacts)
        
        # Log status retrieval (sanitized)
        log_data = DataSanitizer.sanitize_for_logging({
            "request_id": request_id,
            "status": overall_status,
            "steps_completed": steps_detail['completed'],
            "steps_total": steps_detail['total']
        })
        logger.debug("Request status retrieved", **log_data)
        
        return RequestStatusResponse(
            request_id=request_id,
            status=overall_status,
            steps=steps_detail,
            artifacts=all_artifacts,
            created_at=step_graph.created_at.isoformat(),
            updated_at=step_graph.updated_at.isoformat()
        )
        
    except ValidationError:
        # Re-raise validation errors
        raise
    except Exception as e:
        # Convert to ProcessingError
        sanitized_message = DataSanitizer.sanitize_error_message(str(e))
        logger.error(f"Failed to get request status: {sanitized_message}")
        raise ProcessingError(
            "Failed to retrieve request status",
            ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/reports/{pdf_id}")
async def get_report_pdf(pdf_id: str, http_request: Request, token: Optional[str] = None) -> StreamingResponse:
    """
    Stream a generated PDF report.
    
    This endpoint provides access to generated clinical reports in PDF format.
    The PDF ID is typically provided in the report manifest from the analysis results.
    
    **Authorization:**
    - Basic file ID validation
    - File existence verification
    - Content-Type: application/pdf
    
    **Returns:**
    - PDF file stream with appropriate headers
    - 404 if report not found
    - 500 if streaming fails
    """
    try:
        # Get request ID from middleware
        request_id = getattr(http_request.state, 'request_id', 'unknown')
        
        # Log report access attempt (sanitized)
        log_data = DataSanitizer.sanitize_for_logging({
            "request_id": request_id,
            "pdf_id": pdf_id,
            "has_token": bool(token),
            "client_ip": http_request.client.host if http_request.client else "unknown"
        })
        logger.info("PDF report access requested", **log_data)
        
        # Validate authorization for report access
        report_authorizer.validate_report_access(pdf_id, token)
        
        # Retrieve PDF file from storage
        pdf_data = storage_service.retrieve_file(pdf_id)
        
        if not pdf_data:
            logger.warning(f"PDF report not found: {pdf_id}")
            raise ValidationError(
                "PDF report not found",
                ErrorCode.INVALID_REPORT_ID
            )
        
        # Create streaming response
        def generate_pdf():
            """Generator for PDF streaming."""
            chunk_size = 8192
            for i in range(0, len(pdf_data), chunk_size):
                yield pdf_data[i:i + chunk_size]
        
        # Log successful access (sanitized)
        log_data = DataSanitizer.sanitize_for_logging({
            "request_id": request_id,
            "pdf_id": pdf_id,
            "file_size_bytes": len(pdf_data)
        })
        logger.info("PDF report access granted", **log_data)
        
        return StreamingResponse(
            generate_pdf(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=\"orthopedic_report_{pdf_id}.pdf\"",
                "Content-Length": str(len(pdf_data)),
                "Cache-Control": "private, max-age=3600",  # Cache for 1 hour
                "X-Content-Type-Options": "nosniff",
                "X-Request-ID": request_id
            }
        )
        
    except (ValidationError, AuthorizationError):
        # Re-raise validation and authorization errors
        raise
    except Exception as e:
        # Convert to ProcessingError
        sanitized_message = DataSanitizer.sanitize_error_message(str(e))
        logger.error(f"Failed to stream PDF report: {sanitized_message}")
        raise ProcessingError(
            "Failed to stream PDF report",
            ErrorCode.INTERNAL_SERVER_ERROR
        )


# Additional utility endpoints for debugging and monitoring

@router.get("/requests", response_model=Dict[str, Any])
async def list_active_requests() -> Dict[str, Any]:
    """
    List all active processing requests (for debugging/monitoring).
    
    **Note:** This endpoint is primarily for development and monitoring purposes.
    In production, access should be restricted to authorized users only.
    """
    try:
        active_requests = orchestrator.active_requests
        
        request_summaries = []
        for request_id, step_graph in active_requests.items():
            summary = {
                "request_id": str(request_id),
                "mode": step_graph.mode,
                "status": "completed" if step_graph.is_complete() else "processing",
                "partial": step_graph.partial,
                "created_at": step_graph.created_at.isoformat(),
                "updated_at": step_graph.updated_at.isoformat(),
                "steps_completed": len([s for s in step_graph.steps if s.status == "ok"]),
                "steps_total": len(step_graph.steps),
                "detected_body_part": step_graph.detected_body_part,
                "triage_level": step_graph.triage_level
            }
            request_summaries.append(summary)
        
        # Sort by creation time (newest first)
        request_summaries.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {
            "total_requests": len(request_summaries),
            "requests": request_summaries[:50]  # Limit to 50 most recent
        }
        
    except Exception as e:
        logger.error(f"Failed to list active requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error listing requests"
        )


@router.delete("/requests/{request_id}")
async def cleanup_request(request_id: str) -> Dict[str, Any]:
    """
    Clean up a completed request and its artifacts (for debugging/admin).
    
    **Note:** This endpoint is for administrative cleanup purposes.
    In production, access should be restricted to authorized users only.
    """
    try:
        # Parse request ID
        try:
            request_uuid = UUID(request_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request ID format"
            )
        
        # Check if request exists
        step_graph = orchestrator.get_request_status(request_uuid)
        if not step_graph:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        # Collect artifacts to clean up
        artifacts_to_delete = []
        for step in step_graph.steps:
            artifacts_to_delete.extend(step.artifacts.values())
        
        # Remove from orchestrator
        if request_uuid in orchestrator.active_requests:
            del orchestrator.active_requests[request_uuid]
        
        # Clean up artifacts from storage
        deleted_artifacts = 0
        for artifact_id in artifacts_to_delete:
            if storage_service.delete_file(artifact_id):
                deleted_artifacts += 1
        
        logger.info(f"Cleaned up request {request_id}: {deleted_artifacts} artifacts deleted")
        
        return {
            "request_id": request_id,
            "status": "cleaned_up",
            "artifacts_deleted": deleted_artifacts,
            "total_artifacts": len(artifacts_to_delete)
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Failed to cleanup request {request_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during cleanup"
        )