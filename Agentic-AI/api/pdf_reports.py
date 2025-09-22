"""PDF download endpoint for serving generated reports."""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
import tempfile
import os
from pathlib import Path
from loguru import logger

from agents.pdf_report import pdf_report_agent

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/reports/{report_id}/download")
async def download_existing_report(report_id: str):
    """
    Download an existing PDF report by report ID.
    
    Args:
        report_id: The UUID of the report to download
        
    Returns:
        PDF file as downloadable response
    """
    try:
        # Look for the PDF in the reports directory
        reports_dir = Path("reports")
        
        # Try different possible filenames
        possible_filenames = [
            f"orthoassist_report_{report_id}.pdf",
            f"report_{report_id}.pdf",
            f"{report_id}.pdf"
        ]
        
        for filename in possible_filenames:
            file_path = reports_dir / filename
            if file_path.exists():
                logger.info(f"Serving report: {file_path}")
                return FileResponse(
                    path=str(file_path),
                    media_type="application/pdf",
                    filename=f"orthoassist_report_{report_id[:8]}.pdf"
                )
        
        # If we get here, the file wasn't found
        logger.error(f"Report not found: {report_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Report not found: {report_id}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download report {report_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download report: {str(e)}"
        )


@router.post("/generate-pdf-report")
async def generate_pdf_report(analysis_data: dict) -> Response:
    """
    Generate and return a PDF report as a downloadable file.
    
    Args:
        analysis_data: Analysis results from the analyze endpoint
        
    Returns:
        PDF file as downloadable response
    """
    try:
        # Generate PDF
        pdf_bytes = pdf_report_agent.generate_report(analysis_data)
        
        # Return PDF as response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=orthoassist_report_{analysis_data.get('request_id', 'unknown')}.pdf"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to generate PDF report: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF report: {str(e)}"
        )


@router.get("/download-pdf/{request_id}")
async def download_pdf_report(request_id: str):
    """
    Download a PDF report by request ID.
    
    This would typically fetch analysis data from storage and generate PDF.
    For now, it generates a sample report.
    """
    try:
        # In a real implementation, you'd fetch the analysis data from storage
        # For now, we'll create sample data
        sample_data = {
            "request_id": request_id,
            "triage": {
                "level": "AMBER",
                "confidence": 0.72,
                "body_part": "hand",
                "detections": [{"class": "Fracture", "confidence": 0.72}]
            },
            "cloudinary_urls": {
                "original_image_url": "https://example.com/original.jpg",
                "annotated_image_url": "https://example.com/annotated.jpg"
            }
        }
        
        # Generate PDF
        pdf_bytes = pdf_report_agent.generate_report(sample_data)
        
        # Return PDF as response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=orthoassist_report_{request_id}.pdf"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to download PDF report: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download PDF report: {str(e)}"
        )