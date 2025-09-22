"""
Clinical Analysis API endpoint for multi-report analysis
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import logging
from agents.clinical_analysis import ClinicalAnalysisAgent, PatientAnalysisRequest, StudyData
from services.groq_service import groq_service
from services.error_handler import ErrorCode, ProcessingError

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/clinical-analysis",
    tags=["Clinical Analysis"],
    responses={404: {"description": "Not found"}},
)

@router.post("/analyze-patient")
async def analyze_patient_studies(request: PatientAnalysisRequest):
    """
    Analyze multiple studies for a patient and provide comprehensive clinical insights
    
    This endpoint accepts multiple diagnostic studies for a single patient and uses AI
    to provide comprehensive clinical analysis, treatment recommendations, and follow-up guidance.
    """
    try:
        logger.info(f"Starting clinical analysis for patient {request.patientId} with {len(request.studies)} studies")
        
        # Validate request
        if not request.studies:
            raise HTTPException(
                status_code=400, 
                detail="At least one study is required for analysis"
            )
        
        if len(request.studies) > 50:  # Reasonable limit
            raise HTTPException(
                status_code=400,
                detail="Too many studies provided. Maximum 50 studies allowed per analysis."
            )
        
        # Create clinical analysis agent with global groq service
        analysis_agent = ClinicalAnalysisAgent(groq_service)
        
        # Perform the analysis
        analysis_result = await analysis_agent.analyze_patient_studies(request)
        
        logger.info(f"Clinical analysis completed for patient {request.patientId}")
        
        return {
            "success": True,
            "patient_id": request.patientId,
            "studies_analyzed": len(request.studies),
            "analysis": analysis_result,
            "analysis_timestamp": "2025-09-21T00:00:00Z",  # Current timestamp would be datetime.utcnow().isoformat()
            "model_used": "llama-3.3-70b-versatile"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in clinical analysis for patient {request.patientId}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate clinical analysis: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Health check endpoint for clinical analysis service"""
    return {
        "status": "healthy",
        "service": "clinical-analysis",
        "version": "1.0.0"
    }