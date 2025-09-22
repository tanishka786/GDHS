"""Diagnosis Agent for patient-friendly medical summaries."""

import asyncio
import time
from typing import Dict, List, Optional, Any
from loguru import logger

from services.groq_service import groq_service


class DiagnosisAgent:
    """Agent for generating patient-friendly diagnosis summaries."""
    
    def __init__(self):
        """Initialize diagnosis agent."""
        self.agent_name = "diagnosis"
        self.version = "1.0.0"
        logger.info(f"DiagnosisAgent {self.version} initialized")
    
    async def analyze(self, detections: List[Dict[str, Any]], symptoms: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze detections and symptoms to generate diagnosis.
        
        Args:
            detections: List of detection results from YOLO models
            symptoms: Optional patient symptoms
            
        Returns:
            Dict containing diagnosis information
        """
        try:
            # Extract primary finding from detections
            primary_finding = "No fractures detected"
            confidence = 0.0
            
            if detections:
                # Find highest confidence detection
                best_detection = max(detections, key=lambda x: x.get("score", 0))
                confidence = best_detection.get("score", 0)
                
                if confidence > 0.3:  # Lower threshold to capture more detections
                    class_name = best_detection.get("label", "unknown")
                    if "fracture" in class_name.lower():
                        if confidence > 0.7:
                            primary_finding = f"Fracture detected"
                        elif confidence > 0.5:
                            primary_finding = f"Likely fracture"
                        else:
                            primary_finding = f"Possible fracture"
                    else:
                        primary_finding = f"Detected: {class_name}"
                else:
                    # Low confidence detection
                    primary_finding = "Inconclusive findings"
            
            # Generate analysis
            analysis = {
                "primary_finding": primary_finding,
                "confidence": confidence,
                "detections_count": len(detections),
                "symptoms_provided": bool(symptoms),
                "body_part": "hand",  # This should be passed from the calling context
                "recommendations": [
                    "Seek medical evaluation for proper diagnosis",
                    "Follow up with healthcare provider",
                    "Avoid activities that may worsen the condition"
                ]
            }
            
            if symptoms:
                analysis["symptoms_analysis"] = f"Patient reports: {symptoms}"
            
            return analysis
            
        except Exception as e:
            logger.error(f"Diagnosis analysis failed: {e}")
            return {
                "primary_finding": "Analysis failed",
                "confidence": 0.0,
                "error": str(e),
                "recommendations": ["Please consult healthcare professional"]
            }
    
    async def analyze_symptoms(self, symptoms: str, body_part: Optional[str] = None, age: Optional[int] = None) -> Dict[str, Any]:
        """
        Analyze symptoms without imaging data.
        
        Args:
            symptoms: Patient symptoms description
            body_part: Affected body part
            age: Patient age
            
        Returns:
            Dict containing symptom analysis
        """
        try:
            # Basic symptom analysis
            symptoms_lower = symptoms.lower()
            
            possible_conditions = []
            recommendations = []
            
            # Simple keyword-based analysis
            if any(word in symptoms_lower for word in ["pain", "hurt", "ache"]):
                if any(word in symptoms_lower for word in ["sharp", "severe", "intense"]):
                    possible_conditions.append("Acute injury (fracture, sprain)")
                    recommendations.append("Seek immediate medical attention")
                else:
                    possible_conditions.append("Minor injury or strain")
                    recommendations.append("Monitor symptoms and rest")
            
            if any(word in symptoms_lower for word in ["swelling", "swollen"]):
                possible_conditions.append("Inflammation or injury")
                recommendations.append("Apply ice and elevate if possible")
            
            if any(word in symptoms_lower for word in ["deformed", "bent", "crooked"]):
                possible_conditions.append("Possible fracture with displacement")
                recommendations.append("Seek emergency medical care immediately")
            
            if not possible_conditions:
                possible_conditions = ["General musculoskeletal discomfort"]
                recommendations = ["Consider rest and over-the-counter pain relief"]
            
            return {
                "symptoms": symptoms,
                "body_part": body_part,
                "age": age,
                "possible_conditions": possible_conditions,
                "recommendations": recommendations,
                "confidence": 0.6,
                "disclaimer": "This is not a medical diagnosis. Please consult healthcare professional."
            }
            
        except Exception as e:
            logger.error(f"Symptom analysis failed: {e}")
            return {
                "symptoms": symptoms,
                "possible_conditions": ["Unable to analyze symptoms"],
                "recommendations": ["Please consult healthcare professional"],
                "error": str(e),
                "confidence": 0.0
            }
    
    async def generate_patient_summary(
        self,
        triage_result: Dict[str, Any],
        detections: List[Dict[str, Any]],
        symptoms: Optional[str] = None,
        body_part: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate patient-friendly diagnosis summary.
        
        Args:
            triage_result: Triage assessment result with level, rationale, confidence
            detections: List of detection results from YOLO models
            symptoms: Optional patient-reported symptoms
            body_part: Detected body part (hand/leg)
            
        Returns:
            Dict containing patient-friendly summary, recommendations, and disclaimers
        """
        start_time = time.time()
        import uuid
        request_id = f"dx_{int(time.time() * 1000)}_{str(uuid.uuid4())[:8]}"
        
        logger.info(f"[{request_id}] Starting diagnosis summary generation")
        
        try:
            # Validate inputs
            if not isinstance(triage_result, dict):
                raise ValueError("Invalid triage_result format")
            
            if not isinstance(detections, list):
                raise ValueError("Invalid detections format")
            
            # Redact any potential PHI from symptoms
            redacted_symptoms = self._redact_phi(symptoms) if symptoms else None
            
            # Generate summary using Groq service
            summary_result = await groq_service.generate_diagnosis_summary(
                triage_result=triage_result,
                detections=detections,
                symptoms=redacted_symptoms
            )
            
            # Enhance summary with additional context
            enhanced_result = self._enhance_summary(
                summary_result,
                triage_result,
                detections,
                body_part
            )
            
            # Add metadata
            enhanced_result.update({
                "agent": self.agent_name,
                "version": self.version,
                "request_id": request_id,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "timestamp": time.time()
            })
            
            logger.info(f"[{request_id}] Diagnosis summary completed in {enhanced_result['processing_time_ms']}ms")
            
            return enhanced_result
            
        except Exception as e:
            logger.error(f"[{request_id}] Diagnosis summary generation failed: {e}")
            
            # Return safe fallback summary
            return {
                "summary": "We've completed your X-ray analysis. Please consult with a healthcare professional to discuss your results and next steps.",
                "recommendations": [
                    "Schedule an appointment with your healthcare provider",
                    "Bring these results to your medical consultation",
                    "Follow any immediate care instructions you may have received"
                ],
                "urgency_guidance": self._get_urgency_guidance("AMBER"),
                "medical_disclaimer": "This automated analysis is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical decisions.",
                "agent": self.agent_name,
                "version": self.version,
                "request_id": request_id,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "timestamp": time.time(),
                "error": str(e)
            }
    
    def _redact_phi(self, text: str) -> str:
        """
        Redact potential PHI from patient input.
        
        Args:
            text: Input text that may contain PHI
            
        Returns:
            Text with potential PHI redacted
        """
        if not text:
            return text
        
        import re
        
        # Redact patterns that might be PHI
        redacted = text
        
        # Phone numbers (various formats)
        redacted = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE_REDACTED]', redacted)
        redacted = re.sub(r'\b\d{3}-\d{4}\b', '[PHONE_REDACTED]', redacted)  # Short format like 555-1234
        
        # Email addresses
        redacted = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL_REDACTED]', redacted)
        
        # Social Security Numbers
        redacted = re.sub(r'\b\d{3}-?\d{2}-?\d{4}\b', '[SSN_REDACTED]', redacted)
        
        # Dates that might be birthdates (MM/DD/YYYY, MM-DD-YYYY)
        redacted = re.sub(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b', '[DATE_REDACTED]', redacted)
        
        # Names (common patterns - this is basic, real PHI detection would be more sophisticated)
        # Only redact if it looks like "My name is..." or "I am..."
        redacted = re.sub(r'\b(?:my name is|i am|i\'m)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', '[NAME_REDACTED]', redacted, flags=re.IGNORECASE)
        
        # Addresses (basic pattern)
        redacted = re.sub(r'\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b', '[ADDRESS_REDACTED]', redacted, flags=re.IGNORECASE)
        
        return redacted
    
    def _enhance_summary(
        self,
        base_summary: Dict[str, Any],
        triage_result: Dict[str, Any],
        detections: List[Dict[str, Any]],
        body_part: Optional[str]
    ) -> Dict[str, Any]:
        """
        Enhance the base summary with additional context and guidance.
        
        Args:
            base_summary: Base summary from Groq service
            triage_result: Triage assessment result
            detections: Detection results
            body_part: Detected body part
            
        Returns:
            Enhanced summary with additional context
        """
        enhanced = base_summary.copy()
        
        # Add urgency guidance based on triage level
        triage_level = triage_result.get("level", "AMBER")
        enhanced["urgency_guidance"] = self._get_urgency_guidance(triage_level)
        
        # Add body part specific information
        if body_part:
            enhanced["body_part_info"] = self._get_body_part_info(body_part)
        
        # Add detection summary for patient understanding
        enhanced["findings_summary"] = self._create_findings_summary(detections)
        
        # Ensure medical disclaimer is comprehensive
        enhanced["medical_disclaimer"] = self._get_comprehensive_disclaimer()
        
        # Add next steps based on triage level
        enhanced["next_steps"] = self._get_next_steps(triage_level)
        
        return enhanced
    
    def _get_urgency_guidance(self, triage_level: str) -> str:
        """Get urgency guidance based on triage level."""
        guidance_map = {
            "RED": "This analysis suggests findings that may require prompt medical attention. Please contact your healthcare provider or consider visiting an emergency department soon.",
            "AMBER": "This analysis suggests findings that should be evaluated by a healthcare professional within the next day or two. Please schedule an appointment with your doctor.",
            "GREEN": "This analysis suggests findings that can typically be addressed during routine medical care. Please follow up with your healthcare provider as appropriate."
        }
        
        return guidance_map.get(triage_level, guidance_map["AMBER"])
    
    def _get_body_part_info(self, body_part: str) -> str:
        """Get patient-friendly information about the body part analyzed."""
        info_map = {
            "hand": "We analyzed your hand X-ray, looking at the bones, joints, and surrounding structures in your hand and wrist area.",
            "leg": "We analyzed your leg X-ray, examining the bones, joints, and surrounding structures in your leg area.",
            "unknown": "We analyzed your X-ray image to look for any notable findings in the imaged area."
        }
        
        return info_map.get(body_part.lower(), info_map["unknown"])
    
    def _create_findings_summary(self, detections: List[Dict[str, Any]]) -> str:
        """Create patient-friendly summary of findings."""
        if not detections:
            return "No significant abnormalities were detected in your X-ray."
        
        if len(detections) == 1:
            detection = detections[0]
            label = detection.get("label", "finding")
            confidence = detection.get("score", 0.0)
            
            if confidence > 0.8:
                return f"Our analysis identified a {label} with high confidence."
            elif confidence > 0.5:
                return f"Our analysis identified a possible {label}."
            else:
                return f"Our analysis detected a potential {label}, though with lower confidence."
        else:
            return f"Our analysis identified {len(detections)} findings that should be reviewed by a healthcare professional."
    
    def _get_comprehensive_disclaimer(self) -> str:
        """Get comprehensive medical disclaimer."""
        return (
            "IMPORTANT MEDICAL DISCLAIMER: This automated analysis is provided for informational purposes only "
            "and does not constitute medical advice, diagnosis, or treatment. The results should not be used "
            "as a substitute for professional medical consultation, examination, or treatment. Always seek the "
            "advice of qualified healthcare professionals for any medical concerns. In case of medical emergency, "
            "contact emergency services immediately. The accuracy of automated analysis may vary and should "
            "always be confirmed by qualified medical professionals."
        )
    
    def _get_next_steps(self, triage_level: str) -> List[str]:
        """Get next steps based on triage level."""
        steps_map = {
            "RED": [
                "Contact your healthcare provider promptly or consider emergency care",
                "Bring these results to your medical appointment",
                "Follow any immediate care instructions you may have received",
                "Do not delay seeking medical attention"
            ],
            "AMBER": [
                "Schedule an appointment with your healthcare provider within 1-2 days",
                "Bring these results to your medical consultation",
                "Follow any care instructions you may have received",
                "Monitor your symptoms and seek immediate care if they worsen"
            ],
            "GREEN": [
                "Schedule a routine follow-up appointment with your healthcare provider",
                "Bring these results to your next medical visit",
                "Continue any current treatment as directed",
                "Contact your doctor if you have questions or concerns"
            ]
        }
        
        return steps_map.get(triage_level, steps_map["AMBER"])


# Global diagnosis agent instance
diagnosis_agent = DiagnosisAgent()