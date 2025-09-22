"""
Multi-Report Clinical Analysis Agent
Analyzes multiple diagnostic reports for a patient and provides comprehensive clinical insights
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import json

class StudyData(BaseModel):
    id: str
    date: str
    bodyPart: str
    symptoms: Optional[str] = ""
    triage: Dict[str, Any]
    patientSummary: Optional[str] = ""
    recommendations: List[str] = []

class PatientAnalysisRequest(BaseModel):
    patientId: str
    studies: List[StudyData]

class ClinicalAnalysisAgent:
    def __init__(self, groq_service):
        self.groq_service = groq_service
        
    async def analyze_patient_studies(self, patient_request: PatientAnalysisRequest) -> str:
        """
        Analyze multiple studies for a patient and provide comprehensive clinical insights
        """
        try:
            # Prepare the analysis context
            analysis_prompt = self._build_analysis_prompt(patient_request)
            system_prompt = self._get_system_prompt()
            
            # Get AI analysis from Groq using the service's _make_api_call method
            # Fixed to use correct parameter names for GroqService
            response = await self.groq_service._make_api_call(
                system_prompt=system_prompt,
                user_prompt=analysis_prompt,
                model="llama-3.1-8b-instant"  # Using available model
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"Error generating clinical analysis: {str(e)}"
    
    def _get_system_prompt(self) -> str:
        return """You are an experienced radiologist and orthopedic specialist AI assistant with decades of clinical experience. Your role is to analyze multiple diagnostic studies for a single patient and provide comprehensive clinical insights that help doctors make informed treatment decisions.

IMPORTANT GUIDELINES:
1. You are providing clinical decision support, not making final diagnoses
2. Always recommend consulting with appropriate specialists
3. Focus on patterns across multiple studies to identify progression or improvement
4. Provide practical, actionable clinical recommendations
5. Use clear, professional medical language that's accessible to healthcare providers
6. Consider the temporal sequence of studies to assess progression
7. Highlight any concerning patterns that require immediate attention

YOUR ANALYSIS SHOULD INCLUDE:
- **Clinical Summary**: Overview of patient's condition across all studies
- **Temporal Analysis**: How findings have changed over time
- **Risk Assessment**: Priority areas of concern (Red/Amber/Green findings)
- **Clinical Recommendations**: Specific next steps for treatment
- **Follow-up Guidance**: Monitoring and additional testing suggestions
- **Specialist Referrals**: When to involve other specialists

ANALYSIS STRUCTURE:
Provide a well-organized, comprehensive analysis that synthesizes information from all studies to give doctors a complete picture of the patient's condition and clear guidance for clinical management."""

    def _build_analysis_prompt(self, patient_request: PatientAnalysisRequest) -> str:
        """Build the analysis prompt with all patient study data"""
        
        prompt = f"""
PATIENT CLINICAL ANALYSIS REQUEST

Patient ID: {patient_request.patientId}
Total Studies: {len(patient_request.studies)}
Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

CHRONOLOGICAL STUDY HISTORY:
"""
        
        # Sort studies by date for chronological analysis
        sorted_studies = sorted(patient_request.studies, 
                              key=lambda x: datetime.fromisoformat(x.date.replace('Z', '+00:00')))
        
        for i, study in enumerate(sorted_studies, 1):
            study_date = datetime.fromisoformat(study.date.replace('Z', '+00:00'))
            
            prompt += f"""
--- STUDY #{i} ---
Date: {study_date.strftime('%Y-%m-%d %H:%M')}
Body Part: {study.bodyPart}
Patient Symptoms: {study.symptoms or 'Not specified'}

Triage Level: {study.triage.get('level', 'Unknown')}
Detected Body Part: {study.triage.get('bodyPart', 'Unknown')}

AI Detections:
"""
            
            detections = study.triage.get('detections', [])
            if detections:
                for detection in detections:
                    confidence = detection.get('score', 0) * 100
                    prompt += f"  • {detection.get('label', 'Unknown')}: {confidence:.1f}% confidence\n"
            else:
                prompt += "  • No specific detections reported\n"
            
            prompt += f"""
AI Summary: {study.patientSummary or 'No summary available'}

Recommendations:
"""
            if study.recommendations:
                for rec in study.recommendations:
                    prompt += f"  • {rec}\n"
            else:
                prompt += "  • No specific recommendations provided\n"
        
        prompt += """

ANALYSIS REQUEST:
Please provide a comprehensive clinical analysis of this patient based on all the above studies. Focus on:

1. **CLINICAL SUMMARY**: Synthesize findings across all studies
2. **TEMPORAL PROGRESSION**: How has the patient's condition changed over time?
3. **RISK STRATIFICATION**: What are the priority concerns (Red/Amber/Green)?
4. **CLINICAL RECOMMENDATIONS**: What specific treatments or interventions are suggested?
5. **FOLLOW-UP PLAN**: What monitoring or additional testing is needed?
6. **SPECIALIST REFERRALS**: Should this patient see specific specialists?

Provide practical, actionable insights that will help the treating physician make informed clinical decisions for this patient's care.
"""
        
        return prompt


def create_clinical_analysis_agent(groq_client):
    """Factory function to create the clinical analysis agent"""
    return ClinicalAnalysisAgent(groq_client)