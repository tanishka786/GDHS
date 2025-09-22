"""Medical prompt templates for Groq API interactions."""

from typing import Dict, List, Any, Optional
import re


class MedicalPromptTemplates:
    """Collection of medical prompt templates with PHI redaction and safety measures."""
    
    # Standard medical disclaimer
    MEDICAL_DISCLAIMER = (
        "This information is for educational purposes only and should not replace "
        "professional medical advice, diagnosis, or treatment. Always seek the advice "
        "of qualified healthcare providers with any questions you may have regarding "
        "a medical condition. Never disregard professional medical advice or delay "
        "seeking it because of information provided by this system."
    )
    
    # Emergency warning for critical findings
    EMERGENCY_WARNING = (
        "⚠️ IMPORTANT: If you are experiencing severe pain, numbness, inability to move, "
        "or any emergency symptoms, seek immediate medical attention or call emergency services."
    )
    
    @staticmethod
    def redact_phi(text: str) -> str:
        """
        Enhanced PHI redaction for medical text input.
        
        Args:
            text: Input text that may contain PHI
            
        Returns:
            Text with potential PHI redacted and sanitized
        """
        if not text:
            return text
        
        # Comprehensive patterns for PHI detection and redaction
        patterns = [
            # Names (various formats) - more specific to avoid false positives
            (r'\b(?:Mr|Mrs|Ms|Dr|Doctor|Patient)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b', '[NAME]'),
            (r'\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b', '[NAME]'),
            # Full names (first and last) - only match clear name patterns
            (r'\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\s+(has|reports|experienced|complained|stated|mentioned|said)\b', '[NAME] \\3'),
            (r'\b(?:Patient|Mr|Mrs|Ms)\s+[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b', '[NAME]'),
            
            # Contact Information
            (r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', '[PHONE]'),
            (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]'),
            
            # Dates and Times
            (r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', '[DATE]'),
            (r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b', '[DATE]'),
            (r'\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b', '[TIME]'),
            
            # Medical Identifiers
            (r'\b(?:SSN|Social Security):?\s*\d{3}-?\d{2}-?\d{4}\b', '[SSN]'),
            (r'\b(?:MRN|Medical Record|Patient ID):?\s*\d+\b', '[MRN]'),
            (r'\b(?:DOB|Date of Birth):?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', '[DOB]'),
            (r'\b(?:Insurance|Policy)\s*(?:Number|ID)?:?\s*[A-Z0-9]+\b', '[INSURANCE]'),
            
            # Addresses
            (r'\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Place|Pl)\b', '[ADDRESS]'),
            (r'\b[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b', '[ADDRESS]'),
            
            # Age and specific dates that could be identifying
            (r'\b(?:age|aged)\s+\d{1,3}\b', '[AGE]'),
            (r'\b\d{1,3}\s*(?:years?\s*old|y\.?o\.?)\b', '[AGE]'),
            
            # Hospital/Facility names (common patterns)
            (r'\b[A-Z][a-z]+\s+(?:Hospital|Medical Center|Clinic|Healthcare|Health System)\b', '[FACILITY]'),
            
            # Provider names and credentials
            (r'\bDr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b', '[PROVIDER]'),
            (r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:MD|DO|NP|PA|RN)\b', '[PROVIDER]'),
        ]
        
        redacted_text = text
        for pattern, replacement in patterns:
            redacted_text = re.sub(pattern, replacement, redacted_text, flags=re.IGNORECASE)
        
        # Additional sanitization - remove any remaining sequences that look like identifiers
        # Remove sequences of digits that might be IDs (but preserve medical values)
        redacted_text = re.sub(r'\b(?<![\d.])\d{6,}(?![\d.])\b', '[ID]', redacted_text)
        
        # Log redaction for audit purposes (without showing original content)
        if redacted_text != text:
            import logging
            logging.info("PHI redaction applied to user input")
        
        return redacted_text
    
    @classmethod
    def get_triage_system_prompt(cls) -> str:
        """Get enhanced system prompt for orthopedic triage assessment."""
        return f"""You are an expert medical AI assistant specializing in orthopedic emergency triage. Your role is to provide evidence-based urgency assessments for detected fractures and musculoskeletal injuries using established clinical criteria.

CLINICAL TRIAGE FRAMEWORK:

RED (Urgent - <1 hour):
• Displaced fractures with >20° angulation or >50% displacement
• Open/compound fractures with bone exposure
• Fractures with neurovascular compromise (numbness, pallor, absent pulse)
• Multiple fractures in same extremity
• Intra-articular fractures with significant displacement
• Fracture-dislocations
• Compartment syndrome risk (severe swelling, pain out of proportion)

AMBER (Semi-urgent - 4-6 hours):
• Non-displaced or minimally displaced fractures
• Stable fractures with good alignment (<10° angulation)
• Single bone fractures without complications
• Stress fractures with moderate pain
• Suspected fractures with high clinical suspicion
• Joint effusions without fracture

GREEN (Non-urgent - 24-48 hours):
• Hairline/stress fractures without displacement
• Minor avulsion fractures
• Chronic/old healed fractures
• Soft tissue injuries without fracture
• Normal imaging with mild symptoms

CLINICAL REASONING PROCESS:
1. Analyze fracture characteristics: location, pattern, displacement, angulation
2. Assess for complications: neurovascular status, soft tissue involvement
3. Consider mechanism of injury and patient factors
4. Evaluate functional impact and pain severity
5. Apply evidence-based triage criteria
6. When uncertain, err on side of higher acuity for patient safety

ANATOMICAL CONSIDERATIONS:
• Hand/Wrist: Scaphoid fractures (high risk), boxer's fractures, metacarpal injuries
• Forearm: Radius/ulna fractures, Monteggia/Galeazzi patterns
• Leg/Ankle: Tibia/fibula fractures, ankle fractures, foot injuries
• Weight-bearing bones require higher urgency due to functional impact

RESPONSE REQUIREMENTS:
Provide structured JSON response with clinical reasoning:
{{
  "level": "RED|AMBER|GREEN",
  "rationale": [
    "Primary clinical finding with specific details",
    "Supporting evidence from imaging analysis", 
    "Risk factors or complications considered",
    "Clinical reasoning for urgency determination"
  ],
  "confidence": 0.0-1.0,
  "recommendations": [
    "Specific immediate actions based on triage level",
    "Follow-up care instructions",
    "Monitoring parameters"
  ],
  "clinical_indicators": {{
    "displacement": "none|minimal|moderate|severe",
    "angulation": "degrees if measurable",
    "complications": ["list any identified"],
    "functional_impact": "assessment of mobility/function"
  }},
  "medical_disclaimer": "{cls.MEDICAL_DISCLAIMER}"
}}

SAFETY PROTOCOLS:
• Never provide definitive diagnoses - describe findings only
• Always recommend professional medical evaluation
• Include appropriate medical disclaimers
• Prioritize patient safety in all uncertainty
• Document confidence levels honestly
• Escalate urgency when image quality limits assessment"""

    @classmethod
    def get_diagnosis_system_prompt(cls) -> str:
        """Get enhanced system prompt for patient-centered medical communication."""
        return f"""You are an expert medical communication specialist who translates complex orthopedic findings into clear, compassionate patient education. Your role is to help patients understand their X-ray results while maintaining appropriate medical boundaries.

PATIENT COMMUNICATION PRINCIPLES:

LANGUAGE GUIDELINES:
• Use 6th-8th grade reading level vocabulary
• Replace medical jargon with everyday terms
• Explain technical concepts with analogies when helpful
• Be specific but not overwhelming with details
• Maintain professional yet warm tone

EMOTIONAL CONSIDERATIONS:
• Acknowledge patient concerns and anxiety
• Provide reassurance where appropriate without false hope
• Balance honesty with compassion
• Normalize the medical process and next steps
• Emphasize patient agency in their care

EDUCATIONAL APPROACH:
• Explain what was found (or not found) in simple terms
• Describe what findings mean for daily activities
• Provide context for healing timelines when appropriate
• Explain the importance of professional medical care
• Give practical guidance for immediate care

URGENCY-SPECIFIC COMMUNICATION:

RED (Urgent): 
• Emphasize importance of prompt care without causing panic
• Explain why timing matters for best outcomes
• Provide clear, actionable steps
• Reassure about treatability while stressing urgency

AMBER (Semi-urgent):
• Explain need for medical attention with reasonable timeline
• Provide interim care guidance
• Reassure about non-emergency nature while emphasizing importance

GREEN (Non-urgent):
• Reassure about findings while validating concerns
• Explain when routine follow-up is appropriate
• Provide guidance for symptom monitoring

STRUCTURED RESPONSE FORMAT:
{{
  "summary": "Clear, empathetic explanation of X-ray findings using patient-friendly language",
  "what_this_means": "Practical implications for daily life, work, activities, and recovery",
  "next_steps": [
    "Immediate actions patient should take",
    "Medical follow-up recommendations with timing",
    "Self-care measures and activity modifications"
  ],
  "timeline": "Realistic expectations for healing, follow-up, or resolution",
  "when_to_seek_help": "Specific symptoms or situations requiring immediate medical attention",
  "activity_guidance": "What patient can/cannot do while awaiting or receiving care",
  "questions_for_doctor": [
    "Suggested questions patient should ask their healthcare provider"
  ],
  "medical_disclaimer": "{cls.MEDICAL_DISCLAIMER}",
  "emergency_guidance": "{cls.EMERGENCY_WARNING}"
}}

COMMUNICATION SAFETY REQUIREMENTS:
• Never provide specific medical diagnoses or treatment recommendations
• Always direct patients to qualified healthcare providers for medical decisions
• Include comprehensive medical disclaimers
• Provide clear emergency guidance
• Acknowledge limitations of automated analysis
• Emphasize that professional medical judgment is irreplaceable
• Maintain patient dignity and autonomy throughout communication

QUALITY STANDARDS:
• Information must be accurate and evidence-based
• Language must be accessible to diverse patient populations
• Tone must be consistently supportive and professional
• Content must empower patients to make informed decisions about their care"""

    @classmethod
    def build_triage_prompt(
        cls,
        detections: List[Dict[str, Any]],
        symptoms: Optional[str] = None,
        body_part: Optional[str] = None,
        image_quality: Optional[str] = None
    ) -> str:
        """
        Build comprehensive triage assessment prompt.
        
        Args:
            detections: List of detection results from YOLO models
            symptoms: Patient-reported symptoms (will be redacted)
            body_part: Detected body part (hand/leg)
            image_quality: Assessment of image quality
            
        Returns:
            Formatted prompt for triage assessment
        """
        # Redact any potential PHI from symptoms
        clean_symptoms = cls.redact_phi(symptoms) if symptoms else None
        
        # Build detection summary
        detection_summary = "IMAGING FINDINGS:\n"
        if not detections:
            detection_summary += "- No fractures or abnormalities detected in the analysis\n"
        else:
            detection_summary += f"- Total detections: {len(detections)}\n"
            for i, detection in enumerate(detections, 1):
                label = detection.get("label", "unknown finding")
                score = detection.get("score", 0.0)
                bbox = detection.get("bbox", [])
                
                detection_summary += f"- Finding {i}: {label}\n"
                detection_summary += f"  * Confidence: {score:.2f}\n"
                
                if bbox and len(bbox) >= 4:
                    # Calculate relative position
                    x_center = (bbox[0] + bbox[2]) / 2
                    y_center = (bbox[1] + bbox[3]) / 2
                    detection_summary += f"  * Location: Center at ({x_center:.0f}, {y_center:.0f})\n"
        
        # Add anatomical context
        anatomical_context = ""
        if body_part:
            anatomical_context = f"\nANATOMICAL REGION:\n- Body part identified: {body_part}\n"
            
            # Add body-part specific considerations
            if body_part.lower() == "hand":
                anatomical_context += "- Consider: metacarpal fractures, phalangeal injuries, scaphoid fractures\n"
                anatomical_context += "- High-risk areas: scaphoid (poor blood supply), boxer's fractures\n"
            elif body_part.lower() == "leg":
                anatomical_context += "- Consider: tibia/fibula fractures, ankle injuries, foot fractures\n"
                anatomical_context += "- High-risk areas: weight-bearing bones, joint involvement\n"
        
        # Add clinical information
        clinical_info = ""
        if clean_symptoms:
            clinical_info = f"\nCLINICAL INFORMATION:\n- Patient-reported symptoms: {clean_symptoms}\n"
        
        # Add image quality assessment
        quality_info = ""
        if image_quality:
            quality_info = f"\nIMAGE QUALITY:\n- Assessment: {image_quality}\n"
            if "poor" in image_quality.lower() or "limited" in image_quality.lower():
                quality_info += "- Note: Limited image quality may affect assessment accuracy\n"
        
        # Build complete prompt
        user_prompt = f"""{detection_summary}{anatomical_context}{clinical_info}{quality_info}
ASSESSMENT REQUEST:
Please provide a comprehensive triage assessment based on the imaging findings and clinical information above. Consider the type, location, and severity of any detected abnormalities, along with the clinical context provided.

Focus on:
1. Urgency level determination based on fracture characteristics
2. Risk factors that might affect healing or require immediate attention
3. Clinical reasoning for the triage decision
4. Appropriate next steps for patient care

Remember to prioritize patient safety and provide clear rationale for your assessment."""
        
        return user_prompt
    
    @classmethod
    def build_diagnosis_prompt(
        cls,
        triage_result: Dict[str, Any],
        detections: List[Dict[str, Any]],
        symptoms: Optional[str] = None,
        body_part: Optional[str] = None
    ) -> str:
        """
        Build patient-friendly diagnosis summary prompt.
        
        Args:
            triage_result: Result from triage assessment
            detections: Detection results
            symptoms: Patient symptoms (will be redacted)
            body_part: Detected body part
            
        Returns:
            Formatted prompt for diagnosis summary
        """
        # Redact PHI from symptoms
        clean_symptoms = cls.redact_phi(symptoms) if symptoms else None
        
        # Extract triage information
        urgency_level = triage_result.get("level", "Unknown")
        triage_rationale = triage_result.get("rationale", [])
        confidence = triage_result.get("confidence", 0.0)
        
        # Build findings summary for patient
        findings_summary = "ANALYSIS RESULTS:\n"
        findings_summary += f"- Assessment completed with {confidence:.0%} confidence\n"
        findings_summary += f"- Urgency classification: {urgency_level}\n"
        
        if triage_rationale:
            findings_summary += "- Key findings:\n"
            for reason in triage_rationale:
                findings_summary += f"  * {reason}\n"
        
        # Add detection details in patient-friendly terms
        if detections:
            findings_summary += f"- Detected findings: {len(detections)} area(s) of interest identified\n"
            for i, detection in enumerate(detections, 1):
                label = detection.get("label", "finding")
                # Convert technical terms to patient-friendly language
                friendly_label = cls._convert_to_patient_friendly(label)
                findings_summary += f"  * Area {i}: {friendly_label}\n"
        else:
            findings_summary += "- No significant abnormalities detected in the X-ray\n"
        
        # Add body part context
        body_context = ""
        if body_part:
            body_context = f"\nEXAMINED AREA:\n- X-ray focused on: {body_part}\n"
        
        # Add symptom context
        symptom_context = ""
        if clean_symptoms:
            symptom_context = f"\nSYMPTOMS CONSIDERED:\n- Reported concerns: {clean_symptoms}\n"
        
        # Build urgency-specific guidance
        urgency_guidance = cls._get_urgency_guidance(urgency_level)
        
        user_prompt = f"""{findings_summary}{body_context}{symptom_context}
COMMUNICATION TASK:
Please create a patient-friendly explanation of these X-ray results. The patient needs to understand:

1. What was found (or not found) in simple terms
2. What this means for their health and daily activities
3. What steps they should take next
4. When they should seek medical attention
5. What to expect in terms of healing or follow-up

{urgency_guidance}

Remember to:
- Use language a non-medical person can understand
- Be reassuring but honest about findings
- Provide practical guidance for next steps
- Include appropriate safety information
- Emphasize the importance of professional medical care"""
        
        return user_prompt
    
    @staticmethod
    def _convert_to_patient_friendly(technical_term: str) -> str:
        """Convert technical medical terms to patient-friendly language."""
        # Order matters - check more specific terms first
        conversions = [
            ("displaced_fracture", "bone break where pieces have moved out of place"),
            ("hairline_fracture", "very small crack in the bone"),
            ("comminuted_fracture", "bone break with multiple pieces"),
            ("avulsion_fracture", "small piece of bone pulled away by a tendon or ligament"),
            ("stress_fracture", "small crack from repeated stress or overuse"),
            ("greenstick_fracture", "partial break where bone bends but doesn't break completely"),
            ("spiral_fracture", "break that curves around the bone"),
            ("oblique_fracture", "diagonal break across the bone"),
            ("transverse_fracture", "straight break across the bone"),
            ("fracture", "possible break or crack in the bone"),  # General fracture last
        ]
        
        term_lower = technical_term.lower()
        for technical, friendly in conversions:
            if technical in term_lower:
                return friendly
        
        # Default fallback
        return f"area of concern ({technical_term})"
    
    @staticmethod
    def _get_urgency_guidance(urgency_level: str) -> str:
        """Get urgency-specific guidance for patient communication."""
        guidance = {
            "RED": """
URGENT CARE COMMUNICATION STRATEGY:
This assessment indicates findings requiring prompt medical attention. Communication approach:

IMMEDIATE MESSAGING:
- Lead with reassurance: "Your X-ray shows findings that need medical attention, and this is treatable"
- Explain urgency without panic: "Getting care soon helps ensure the best healing outcome"
- Provide specific timeframe: "You should seek medical care within the next few hours"
- Emphasize treatability: "With proper medical care, these types of injuries typically heal well"

PRACTICAL GUIDANCE:
- Give clear next steps: where to go, what to bring, who to call
- Explain what to expect: "The medical team will likely..."
- Provide interim care: pain management, immobilization, activity restrictions
- Address common concerns: cost, time, treatment options

REASSURANCE ELEMENTS:
- Normalize the process: "This is a common type of injury that doctors treat regularly"
- Emphasize positive outcomes: "Most people recover well with appropriate treatment"
- Validate feelings: "It's normal to feel concerned, and seeking care is the right step"
""",
            
            "AMBER": """
SEMI-URGENT CARE COMMUNICATION STRATEGY:
This assessment indicates findings needing medical evaluation within a reasonable timeframe.

BALANCED MESSAGING:
- Start with context: "Your X-ray shows findings that need medical attention, but this is not an emergency"
- Explain timing: "You should see a healthcare provider within the next day or two"
- Provide rationale: "Getting care in this timeframe helps prevent complications and ensures proper healing"
- Offer reassurance: "You have time to schedule an appropriate appointment"

INTERIM GUIDANCE:
- Symptom management: safe pain relief options, activity modifications
- Monitoring instructions: what symptoms would require more urgent care
- Practical planning: scheduling appointments, preparing questions
- Self-advocacy: what to tell the scheduler about urgency level

EMPOWERMENT FOCUS:
- Explain patient role: "You can help your recovery by..."
- Provide control: "While you're waiting for your appointment, you can..."
- Normalize timeline: "This type of finding is commonly managed on this timeline"
""",
            
            "GREEN": """
ROUTINE CARE COMMUNICATION STRATEGY:
This assessment indicates minor findings or no significant abnormalities.

REASSURING MESSAGING:
- Lead with positive news: "Your X-ray shows no urgent concerns"
- Validate the decision to seek care: "You made the right choice getting this checked"
- Explain findings clearly: "What we found is [minor/normal/expected]"
- Provide context: "This type of finding is common and typically not concerning"

ONGOING CARE GUIDANCE:
- Explain when follow-up might be helpful: "If symptoms persist or worsen..."
- Provide symptom monitoring: "Watch for these changes that would warrant medical attention..."
- Normalize healing process: "Some discomfort during healing is normal"
- Encourage self-advocacy: "Trust your body and seek care if you're concerned"

PREVENTIVE FOCUS:
- Discuss activity modifications if relevant
- Provide general injury prevention advice
- Explain when routine follow-up might be appropriate
- Emphasize that professional consultation remains valuable for peace of mind
"""
        }
        
        return guidance.get(urgency_level, guidance["AMBER"])
    
    @classmethod
    def get_specialized_triage_prompt(cls, body_part: str, injury_mechanism: Optional[str] = None) -> str:
        """Get body-part specific triage guidance."""
        
        specialized_guidance = {
            "hand": """
HAND/WRIST SPECIFIC TRIAGE CONSIDERATIONS:

HIGH-RISK PATTERNS:
• Scaphoid fractures: High risk of avascular necrosis, often require urgent orthopedic evaluation
• Boxer's fractures: Assess for rotation, angulation >40° requires reduction
• Metacarpal neck fractures: Check for malrotation (finger overlap when making fist)
• Intra-articular fractures: Any joint involvement increases urgency
• Thumb injuries: CMC joint dislocations, Bennett/Rolando fractures need urgent care

CLINICAL ASSESSMENT PRIORITIES:
• Neurovascular status: Median, ulnar, radial nerve function
• Tendon integrity: Ability to flex/extend fingers
• Rotational alignment: Finger cascade when making fist
• Compartment syndrome risk: Severe swelling, pain with passive motion

MECHANISM-SPECIFIC RISKS:
• Fall on outstretched hand (FOOSH): Scaphoid, distal radius fractures
• Direct blow/punch: Boxer's fracture, metacarpal injuries
• Crush injury: Multiple fractures, soft tissue damage, compartment syndrome
• Hyperextension: PIP joint injuries, volar plate avulsions
""",
            
            "leg": """
LEG/ANKLE SPECIFIC TRIAGE CONSIDERATIONS:

HIGH-RISK PATTERNS:
• Tibia/fibula fractures: Weight-bearing bone injuries, assess for compartment syndrome
• Ankle fractures: Bimalleolar, trimalleolar patterns require urgent orthopedic care
• Pilon fractures: High-energy injuries with significant soft tissue damage
• Calcaneus fractures: Often associated with spinal injuries (fall from height)
• Lisfranc injuries: Subtle but serious midfoot injuries

CLINICAL ASSESSMENT PRIORITIES:
• Weight-bearing ability: Complete inability suggests significant injury
• Neurovascular status: Dorsalis pedis, posterior tibial pulses
• Compartment syndrome: Anterior, lateral, posterior, deep compartments
• Soft tissue integrity: Open fractures, severe swelling

MECHANISM-SPECIFIC RISKS:
• High-energy trauma: Multiple injuries, compartment syndrome risk
• Twisting injury: Ankle fractures, ligament injuries
• Direct blow: Tibia fractures, foot fractures
• Fall from height: Calcaneus fractures, associated spinal injuries

FUNCTIONAL CONSIDERATIONS:
• Weight-bearing restrictions impact mobility and independence
• Lower extremity injuries often require assistive devices
• DVT risk with immobilization, especially in older patients
"""
        }
        
        return specialized_guidance.get(body_part.lower(), "")
    
    @classmethod
    def get_clinical_decision_rules(cls) -> str:
        """Get evidence-based clinical decision rules for orthopedic injuries."""
        
        return """
EVIDENCE-BASED CLINICAL DECISION RULES:

OTTAWA ANKLE RULES (for ankle X-rays):
• Bone tenderness at posterior edge or tip of lateral malleolus
• Bone tenderness at posterior edge or tip of medial malleolus  
• Inability to bear weight both immediately and in ED (4 steps)

OTTAWA FOOT RULES (for foot X-rays):
• Bone tenderness at base of 5th metatarsal
• Bone tenderness at navicular
• Inability to bear weight both immediately and in ED (4 steps)

SCAPHOID FRACTURE INDICATORS:
• Anatomical snuffbox tenderness
• Scaphoid tubercle tenderness
• Pain with axial loading of thumb
• Decreased grip strength

COMPARTMENT SYNDROME RED FLAGS:
• Pain out of proportion to injury
• Pain with passive stretching of muscles
• Paresthesias in nerve distribution
• Pulselessness (late finding)
• Pallor (late finding)

NEUROVASCULAR COMPROMISE INDICATORS:
• Absent or diminished pulses
• Capillary refill >2 seconds
• Sensory deficits in nerve distributions
• Motor weakness or paralysis
• Color changes (pallor, cyanosis)

FRACTURE STABILITY ASSESSMENT:
• Displacement: >50% cortical contact lost
• Angulation: >20° in any plane
• Shortening: >1cm overlap
• Rotation: Clinical malalignment
• Intra-articular: Any step-off >2mm
"""
    
    @classmethod
    def get_medical_disclaimer_variations(cls, urgency_level: str) -> str:
        """Get urgency-appropriate medical disclaimers."""
        
        disclaimers = {
            "RED": f"""
{cls.MEDICAL_DISCLAIMER}

URGENT CARE NOTICE: This automated analysis suggests findings that may require prompt medical attention. This assessment is not a substitute for immediate professional medical evaluation. If you are experiencing severe symptoms, do not delay seeking emergency medical care.
""",
            
            "AMBER": f"""
{cls.MEDICAL_DISCLAIMER}

MEDICAL FOLLOW-UP NOTICE: This automated analysis suggests findings that warrant medical evaluation within a reasonable timeframe. A healthcare professional should evaluate these findings to determine appropriate treatment and follow-up care.
""",
            
            "GREEN": f"""
{cls.MEDICAL_DISCLAIMER}

ROUTINE CARE NOTICE: While this automated analysis suggests no urgent concerns, professional medical evaluation remains valuable for comprehensive assessment and peace of mind. Continue to monitor your symptoms and seek care if concerns arise.
"""
        }
        
        return disclaimers.get(urgency_level, cls.MEDICAL_DISCLAIMER)
    
    @classmethod
    def get_patient_education_content(cls, finding_type: str) -> Dict[str, str]:
        """Get patient education content for common orthopedic findings."""
        
        education_content = {
            "fracture": {
                "what_it_is": "A fracture is a break in the bone. Bones are living tissue that can heal when properly treated.",
                "healing_process": "Bone healing typically occurs in stages over several weeks to months, depending on the location and severity.",
                "factors_affecting_healing": "Age, nutrition, smoking, and following medical advice all affect how well bones heal.",
                "activity_expectations": "Your doctor will guide you on when you can return to normal activities safely."
            },
            
            "no_fracture": {
                "what_it_means": "No broken bones were detected in your X-ray, which is good news.",
                "other_possibilities": "Soft tissue injuries like sprains or strains don't always show on X-rays but can still cause pain.",
                "when_symptoms_persist": "If pain or other symptoms continue, follow up with your healthcare provider for further evaluation.",
                "normal_healing": "Soft tissue injuries often heal with rest, ice, and gradual return to activity."
            },
            
            "stress_fracture": {
                "what_it_is": "A stress fracture is a small crack in the bone caused by repeated stress or overuse.",
                "common_causes": "Often occurs in athletes or people who suddenly increase their activity level.",
                "healing_approach": "Usually heals well with rest and gradual return to activity as guided by your doctor.",
                "prevention": "Proper training progression and adequate rest can help prevent future stress fractures."
            }
        }
        
        return education_content.get(finding_type, {})
    
    @classmethod
    def validate_prompt_safety(cls, prompt: str) -> Dict[str, Any]:
        """
        Validate that a prompt meets medical safety requirements.
        
        Args:
            prompt: The prompt text to validate
            
        Returns:
            Dictionary with validation results and recommendations
        """
        validation_result = {
            "is_safe": True,
            "warnings": [],
            "recommendations": [],
            "phi_detected": False,
            "disclaimer_present": False
        }
        
        # Check for medical disclaimer
        if cls.MEDICAL_DISCLAIMER in prompt:
            validation_result["disclaimer_present"] = True
        else:
            validation_result["warnings"].append("Medical disclaimer not found")
            validation_result["recommendations"].append("Add medical disclaimer to all medical content")
        
        # Check for potential PHI patterns
        phi_patterns = [
            (r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', "Potential names detected"),
            (r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', "Potential phone numbers detected"),
            (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', "Potential email addresses detected"),
            (r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', "Potential dates detected"),
            (r'\b\d{6,}\b', "Potential ID numbers detected")
        ]
        
        for pattern, warning in phi_patterns:
            if re.search(pattern, prompt):
                validation_result["phi_detected"] = True
                validation_result["warnings"].append(warning)
                validation_result["recommendations"].append("Apply PHI redaction before using prompt")
        
        # Check for emergency guidance in patient-facing content
        if "patient" in prompt.lower() and cls.EMERGENCY_WARNING not in prompt:
            validation_result["recommendations"].append("Consider adding emergency guidance for patient-facing content")
        
        # Check for appropriate medical language
        concerning_phrases = [
            "definitely", "certainly", "guaranteed", "cure", "always works"
        ]
        
        for phrase in concerning_phrases:
            if phrase in prompt.lower():
                validation_result["warnings"].append(f"Potentially inappropriate medical language: '{phrase}'")
                validation_result["recommendations"].append("Use more cautious medical language")
        
        # Overall safety assessment
        if validation_result["warnings"] or validation_result["phi_detected"]:
            validation_result["is_safe"] = False
        
        return validation_result
    
    @classmethod
    def enhance_prompt_with_safety_measures(cls, prompt: str, urgency_level: str = "AMBER") -> str:
        """
        Enhance a prompt with appropriate safety measures and disclaimers.
        
        Args:
            prompt: The base prompt to enhance
            urgency_level: The urgency level for appropriate disclaimers
            
        Returns:
            Enhanced prompt with safety measures
        """
        # Apply PHI redaction
        safe_prompt = cls.redact_phi(prompt)
        
        # Add appropriate medical disclaimer
        disclaimer = cls.get_medical_disclaimer_variations(urgency_level)
        
        # Add emergency warning for patient-facing content
        emergency_section = ""
        if "patient" in prompt.lower():
            emergency_section = f"\n\nEMERGENCY GUIDANCE:\n{cls.EMERGENCY_WARNING}\n"
        
        # Combine all elements
        enhanced_prompt = f"""{safe_prompt}

MEDICAL SAFETY REQUIREMENTS:
{disclaimer}{emergency_section}
PROFESSIONAL JUDGMENT REQUIRED: This automated analysis supports but does not replace professional medical evaluation and clinical decision-making."""
        
        return enhanced_prompt
    
    @classmethod
    def get_audit_safe_prompt_summary(cls, prompt_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate audit-safe summary of prompt usage without exposing PHI.
        
        Args:
            prompt_type: Type of prompt (triage, diagnosis, etc.)
            parameters: Parameters used (will be sanitized)
            
        Returns:
            Audit-safe summary for logging
        """
        safe_summary = {
            "prompt_type": prompt_type,
            "timestamp": None,  # Should be added by calling code
            "parameters_provided": list(parameters.keys()) if parameters else [],
            "phi_redaction_applied": False,
            "safety_measures_applied": True
        }
        
        # Check if PHI redaction was needed (without exposing the PHI)
        if parameters:
            for key, value in parameters.items():
                if isinstance(value, str) and value:
                    original_value = value
                    redacted_value = cls.redact_phi(value)
                    if original_value != redacted_value:
                        safe_summary["phi_redaction_applied"] = True
                        break
        
        return safe_summary