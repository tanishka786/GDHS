"""Groq API service for LLM interactions."""

import asyncio
import time
from typing import Dict, List, Optional, Any
from loguru import logger

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    Groq = None

from app.config import config
from services.prompt_templates import MedicalPromptTemplates


class GroqService:
    """Service for interacting with Groq API for medical LLM tasks."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Groq service."""
        self.api_key = api_key or config.groq_api_key
        self.client = None
        self.is_initialized = False
        self.use_mock = False
        
        # Medical-specific configuration - using currently available models
        self.triage_model = "llama-3.1-8b-instant"  # Fast model for triage
        self.diagnosis_model = "llama-3.1-8b-instant"  # Use same model for consistency
        # Alternative models to try if the above fail:
        self.fallback_models = [
            "llama-3.1-8b-instant",
            "llama3-8b-8192",
            "mixtral-8x7b-32768",
            "gemma-7b-it"
        ]
        self.temperature = 0.1  # Low temperature for medical consistency
        self.max_tokens = 2048  # Increased for detailed explanations
        self.timeout = 45.0  # Increased timeout for complex medical reasoning
        self.max_retries = 3  # Configurable retry attempts
        
        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 0.1  # Minimum seconds between requests
        
        logger.info("GroqService initialized with enhanced medical configuration")
    
    def _initialize_client(self) -> None:
        """Initialize Groq client."""
        if self.is_initialized:
            return
        
        # Use mock if SDK missing or API key not configured
        if (not GROQ_AVAILABLE) or (not self.api_key) or (self.api_key == "your_groq_api_key_here"):
            logger.warning("Using mock Groq client (SDK missing or API key not configured)")
            self.client = self._create_mock_client()
            self.use_mock = True
        else:
            try:
                self.client = Groq(api_key=self.api_key)
                self.use_mock = False
                logger.info("Groq client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")
                self.client = self._create_mock_client()
                self.use_mock = True
        
        # Ensure we always have a client
        if self.client is None:
            logger.warning("Client is None, creating mock client as fallback")
            self.client = self._create_mock_client()
            self.use_mock = True
            
        self.is_initialized = True
    
    def _create_mock_client(self):
        """Create mock Groq client for development/testing."""
        class MockGroqClient:
            def __init__(self):
                self.chat = MockChatCompletions()
        
        class MockChatCompletions:
            def create(self, **kwargs):
                # Mock response based on the prompt content
                messages = kwargs.get("messages", [])
                user_message = ""
                system_message = ""
                for msg in messages:
                    if msg.get("role") == "user":
                        user_message = msg.get("content", "").lower()
                    elif msg.get("role") == "system":
                        system_message = msg.get("content", "").lower()
                
                # Check if this is a clinical analysis request
                if "clinical analysis" in system_message or "multiple studies" in user_message or "patient analysis" in user_message:
                    # Return mock clinical analysis
                    analysis = """**CLINICAL SUMMARY**
Based on the analysis of multiple diagnostic studies for this patient, the imaging findings suggest a progressive orthopedic condition requiring clinical attention.

**TEMPORAL PROGRESSION**
The studies show evolution of findings over time, indicating either healing progression or potential complications that warrant monitoring.

**RISK ASSESSMENT**
- Primary concern: Bone integrity and healing progress
- Secondary considerations: Functional outcome and rehabilitation needs
- Priority level: Moderate (AMBER) - requires timely medical evaluation

**CLINICAL RECOMMENDATIONS**
1. Clinical correlation with current symptoms and functional status
2. Consider orthopedic consultation for treatment planning
3. Implement appropriate weight-bearing restrictions if indicated
4. Monitor for signs of complications or delayed healing

**FOLLOW-UP GUIDANCE**
- Serial imaging to assess healing progression
- Functional assessment and rehabilitation planning
- Patient education regarding activity modifications

**SPECIALIST REFERRALS**
Recommend orthopedic specialist evaluation for comprehensive treatment planning and optimization of clinical outcomes.

*This analysis is for clinical decision support only. Final diagnosis and treatment decisions should always be made by qualified healthcare professionals with direct patient examination.*"""
                    
                    return MockClinicalAnalysisResponse(analysis)
                
                # Generate mock triage response based on keywords and detection count
                detection_count = user_message.count("detection") + user_message.count("finding")
                
                if "displaced" in user_message or "severe" in user_message or detection_count > 2:
                    level = "RED"
                    rationale = ["Multiple fractures detected", "Displaced bone fragments identified", "Requires immediate medical attention"]
                    confidence = 0.89
                elif "fracture" in user_message or "break" in user_message or detection_count > 0:
                    level = "AMBER"
                    rationale = ["Fracture detected in imaging", "Bone disruption identified", "Requires medical evaluation within hours"]
                    confidence = 0.82
                elif "hand" in user_message or "leg" in user_message:
                    level = "AMBER"
                    rationale = ["Anatomical region assessed", "Recommend clinical correlation", "Medical evaluation advised"]
                    confidence = 0.68
                else:
                    level = "GREEN"
                    rationale = ["No acute fractures identified", "Bone structure appears intact", "Routine follow-up recommended"]
                    confidence = 0.72
                
                mock_response = MockResponse(
                    level=level,
                    rationale=rationale,
                    confidence=confidence
                )
                
                return mock_response
        
        class MockResponse:
            def __init__(self, level: str, rationale: List[str], confidence: float):
                self.choices = [MockChoice(level, rationale, confidence)]
        
        class MockChoice:
            def __init__(self, level: str, rationale: List[str], confidence: float):
                import json
                content = json.dumps({
                    "level": level,
                    "rationale": rationale,
                    "confidence": confidence
                })
                self.message = MockMessage(content)
        
        class MockMessage:
            def __init__(self, content: str):
                self.content = content
        
        # Mock response for clinical analysis
        class MockClinicalAnalysisResponse:
            def __init__(self, analysis_content: str):
                self.choices = [MockClinicalAnalysisChoice(analysis_content)]
        
        class MockClinicalAnalysisChoice:
            def __init__(self, analysis_content: str):
                self.message = MockMessage(analysis_content)
                
        # Enhanced mock response for diagnosis summaries
        class MockDiagnosisResponse:
            def __init__(self, triage_level: str, detection_count: int):
                self.choices = [MockDiagnosisChoice(triage_level, detection_count)]
        
        class MockDiagnosisChoice:
            def __init__(self, triage_level: str, detection_count: int):
                import json
                
                # Generate appropriate patient summary based on triage level
                if triage_level == "RED":
                    summary = f"Your X-ray analysis shows {detection_count} significant finding(s) that require prompt medical attention. The imaging reveals bone disruption that needs professional evaluation and treatment to ensure proper healing."
                    what_this_means = "This means there are changes in your bone structure that could affect healing if not treated appropriately. Getting medical care soon helps ensure the best possible outcome."
                    next_steps = ["Seek medical attention within the next few hours", "Bring your X-ray images to the appointment", "Avoid putting weight or stress on the affected area"]
                    timeline = "Medical evaluation needed within 2-4 hours"
                    when_to_seek_help = "Seek immediate care if you experience severe pain, numbness, or inability to move the affected area"
                elif triage_level == "AMBER":
                    summary = f"Your X-ray analysis shows {detection_count} finding(s) that warrant medical evaluation. While not an emergency, these findings should be assessed by a healthcare professional to determine the best course of treatment."
                    what_this_means = "This means there are changes visible in your X-ray that a doctor should evaluate. With proper medical care, most people with similar findings recover well."
                    next_steps = ["Schedule an appointment with your healthcare provider within 1-2 days", "Bring your X-ray images to the appointment", "Monitor your symptoms and avoid activities that cause pain"]
                    timeline = "Medical evaluation recommended within 24-48 hours"
                    when_to_seek_help = "Seek immediate care if pain becomes severe, you develop numbness, or symptoms significantly worsen"
                else:  # GREEN
                    if detection_count > 0:
                        summary = f"Your X-ray analysis shows {detection_count} minor finding(s) that appear to be of low clinical significance. No urgent concerns were identified in the imaging."
                        what_this_means = "This means the findings are likely minor and not immediately concerning. However, professional medical evaluation can provide peace of mind and ensure nothing is missed."
                    else:
                        summary = "Your X-ray analysis shows no significant abnormalities or fractures. The bone structure appears intact with no acute injuries identified."
                        what_this_means = "This is good news - no broken bones or serious injuries were detected in your X-ray. Your symptoms may be related to soft tissue injury or other causes."
                    
                    next_steps = ["Consider routine follow-up with your healthcare provider if symptoms persist", "Monitor your symptoms over the next few days", "Return to normal activities as tolerated"]
                    timeline = "Routine medical follow-up as needed"
                    when_to_seek_help = "Seek medical attention if symptoms worsen significantly or new concerning symptoms develop"
                
                content = json.dumps({
                    "summary": summary,
                    "what_this_means": what_this_means,
                    "next_steps": next_steps,
                    "timeline": timeline,
                    "when_to_seek_help": when_to_seek_help,
                    "medical_disclaimer": "This information is for educational purposes only and should not replace professional medical advice, diagnosis, or treatment.",
                    "emergency_guidance": "If you are experiencing severe pain, numbness, inability to move, or any emergency symptoms, seek immediate medical attention."
                })
                self.message = MockMessage(content)
        
        # Update the mock client to handle both triage and diagnosis requests
        class MockChatCompletions:
            def create(self, **kwargs):
                messages = kwargs.get("messages", [])
                user_message = ""
                for msg in messages:
                    if msg.get("role") == "user":
                        user_message = msg.get("content", "").lower()
                
                # Check if this is a diagnosis request (contains triage_result or diagnosis keywords)
                if "diagnosis" in user_message or "patient-friendly" in user_message or "summary" in user_message:
                    # Extract triage level and detection count from the message
                    if "red" in user_message:
                        triage_level = "RED"
                    elif "amber" in user_message:
                        triage_level = "AMBER"
                    else:
                        triage_level = "GREEN"
                    
                    detection_count = user_message.count("detection") + user_message.count("finding")
                    return MockDiagnosisResponse(triage_level, detection_count)
                else:
                    # Original triage response logic
                    detection_count = user_message.count("detection") + user_message.count("finding")
                    
                    if "displaced" in user_message or "severe" in user_message or detection_count > 2:
                        level = "RED"
                        rationale = ["Multiple fractures detected", "Displaced bone fragments identified", "Requires immediate medical attention"]
                        confidence = 0.89
                    elif "fracture" in user_message or "break" in user_message or detection_count > 0:
                        level = "AMBER"
                        rationale = ["Fracture detected in imaging", "Bone disruption identified", "Requires medical evaluation within hours"]
                        confidence = 0.82
                    elif "hand" in user_message or "leg" in user_message:
                        level = "AMBER"
                        rationale = ["Anatomical region assessed", "Recommend clinical correlation", "Medical evaluation advised"]
                        confidence = 0.68
                    else:
                        level = "GREEN"
                        rationale = ["No acute fractures identified", "Bone structure appears intact", "Routine follow-up recommended"]
                        confidence = 0.72
                    
                    mock_response = MockResponse(level, rationale, confidence)
                    return mock_response
        
        return MockGroqClient()
    
    async def generate_triage_assessment(
        self,
        detections: List[Dict[str, Any]],
        symptoms: Optional[str] = None,
        body_part: Optional[str] = None,
        image_quality: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate triage assessment using Groq API with enhanced medical prompting.
        
        Args:
            detections: List of detection results from YOLO models
            symptoms: Optional patient-reported symptoms (will be redacted for PHI)
            body_part: Detected body part (hand/leg)
            image_quality: Assessment of image quality
            
        Returns:
            Dict with triage level, rationale, confidence, and medical disclaimers
        """
        start_time = time.time()
        request_id = f"triage_{int(time.time() * 1000)}"
        
        try:
            if not self.is_initialized:
                self._initialize_client()
            
            logger.info(f"Starting triage assessment {request_id}")
            
            # Build enhanced prompt using templates
            user_prompt = MedicalPromptTemplates.build_triage_prompt(
                detections=detections,
                symptoms=symptoms,
                body_part=body_part,
                image_quality=image_quality
            )
            
            # Make API call with retry logic
            response = await self._make_api_call(
                system_prompt=MedicalPromptTemplates.get_triage_system_prompt(),
                user_prompt=user_prompt,
                model=self.triage_model,
                request_id=request_id
            )
            
            # Parse and validate response
            result = self._parse_triage_response(response)
            
            # Add metadata
            result.update({
                "inference_time_ms": round((time.time() - start_time) * 1000, 2),
                "request_id": request_id,
                "model_used": self.triage_model,
                "phi_redacted": bool(symptoms)  # Indicate if PHI redaction was applied
            })
            
            logger.info(f"Triage assessment {request_id} completed: {result['level']} (confidence: {result.get('confidence', 0):.2f})")
            
            return result
            
        except Exception as e:
            logger.error(f"Triage assessment {request_id} failed: {e}")
            # Return safe fallback result with medical disclaimer
            return {
                "level": "AMBER",
                "rationale": ["Assessment system temporarily unavailable", "Recommend medical evaluation for safety"],
                "confidence": 0.0,
                "recommendations": ["Seek professional medical evaluation", "Monitor symptoms closely"],
                "medical_disclaimer": MedicalPromptTemplates.MEDICAL_DISCLAIMER,
                "error": str(e),
                "inference_time_ms": round((time.time() - start_time) * 1000, 2),
                "request_id": request_id,
                "fallback_used": True
            }
    

    
    async def _make_api_call(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        model: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> Any:
        """
        Make API call to Groq with enhanced retry logic and rate limiting.
        
        Args:
            system_prompt: System prompt for the model
            user_prompt: User prompt content
            model: Model to use (defaults to triage model)
            request_id: Optional request ID for logging
            
        Returns:
            API response object
        """
        # Initialize client if not already done
        if not self.is_initialized:
            self._initialize_client()
        
        # Rate limiting
        await self._enforce_rate_limit()
        
        model = model or self.triage_model
        messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user", 
                "content": user_prompt
            }
        ]
        
        # Try different models if the primary one fails
        models_to_try = [model] + [m for m in self.fallback_models if m != model]
        
        for model_attempt, current_model in enumerate(models_to_try):
            for attempt in range(self.max_retries + 1):
                try:
                    logger.debug(f"Making Groq API call with model {current_model} (attempt {attempt + 1}/{self.max_retries + 1}) for {request_id or 'unknown'}")
                    
                    if not self.use_mock and GROQ_AVAILABLE and self.client is not None and hasattr(self.client, 'chat') and hasattr(self.client.chat, 'completions'):
                        response = self.client.chat.completions.create(
                            model=current_model,
                            messages=messages,
                            temperature=self.temperature,
                            max_tokens=self.max_tokens,
                            timeout=self.timeout,
                            # Additional safety parameters
                            top_p=0.9,  # Nucleus sampling for consistency
                            frequency_penalty=0.1,  # Slight penalty for repetition
                            presence_penalty=0.1   # Encourage diverse vocabulary
                        )
                    else:
                        # Use mock client - ensure it has the right structure
                        if hasattr(self.client, 'chat') and hasattr(self.client.chat, 'create'):
                            response = self.client.chat.create(
                                model=current_model,
                                messages=messages,
                                temperature=self.temperature,
                                max_tokens=self.max_tokens
                            )
                        else:
                            # Fallback: recreate mock client if structure is wrong
                            self.client = self._create_mock_client()
                            self.use_mock = True
                            response = self.client.chat.create(
                                model=current_model,
                                messages=messages,
                                temperature=self.temperature,
                                max_tokens=self.max_tokens
                            )
                    
                    logger.debug(f"Groq API call successful with model {current_model} for {request_id or 'unknown'}")
                    return response
                    
                except Exception as e:
                    error_type = type(e).__name__
                    error_message = str(e)
                    
                    # Check if it's a model decommissioned error
                    if "decommissioned" in error_message.lower() or "not supported" in error_message.lower():
                        logger.warning(f"Model {current_model} is decommissioned, trying next model")
                        break  # Try next model
                    
                    # Determine if error is retryable
                    retryable_errors = [
                        "RateLimitError", "TimeoutError", "ConnectionError", 
                        "InternalServerError", "ServiceUnavailableError"
                    ]
                    
                    is_retryable = any(err in error_type for err in retryable_errors)
                    
                    if attempt < self.max_retries and is_retryable:
                        # Exponential backoff with jitter
                        wait_time = (2 ** attempt) + (time.time() % 1)  # Add jitter
                        logger.warning(
                            f"Groq API call failed (attempt {attempt + 1}/{self.max_retries + 1}) "
                            f"for {request_id or 'unknown'}: {error_type} - {e}. "
                            f"Retrying in {wait_time:.1f}s"
                        )
                        await asyncio.sleep(wait_time)
                    else:
                        if model_attempt < len(models_to_try) - 1:
                            logger.warning(f"Model {current_model} failed, trying next model")
                            break  # Try next model
                        else:
                            logger.error(
                                f"Groq API call failed after trying all models and {attempt + 1} attempts "
                                f"for {request_id or 'unknown'}: {error_type} - {e}"
                            )
                            raise
    
    async def _enforce_rate_limit(self) -> None:
        """Enforce rate limiting between API calls."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last
            await asyncio.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _parse_triage_response(self, response: Any) -> Dict[str, Any]:
        """Parse and validate triage response from Groq with enhanced validation."""
        try:
            # Extract content from response
            if hasattr(response, 'choices') and response.choices:
                content = response.choices[0].message.content
            else:
                raise ValueError("Invalid response format from Groq API")
            
            # Parse JSON content with multiple fallback strategies
            import json
            import re
            
            result = None
            
            # Strategy 1: Direct JSON parsing
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                # Strategy 2: Extract JSON block from markdown or text
                json_patterns = [
                    r'```json\s*(\{.*?\})\s*```',  # JSON in code blocks
                    r'```\s*(\{.*?\})\s*```',      # Generic code blocks
                    r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}',  # Nested JSON objects
                ]
                
                for pattern in json_patterns:
                    matches = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)
                    for match in matches:
                        try:
                            result = json.loads(match)
                            break
                        except json.JSONDecodeError:
                            continue
                    if result:
                        break
                
                if not result:
                    raise ValueError("No valid JSON found in response")
            
            # Validate and sanitize the response
            validated_result = self._validate_triage_fields(result)
            
            return validated_result
            
        except Exception as e:
            logger.error(f"Failed to parse triage response: {e}")
            logger.debug(f"Raw response content: {getattr(response, 'choices', [{}])[0].message.content if hasattr(response, 'choices') else 'No content'}")
            
            # Return safe fallback with medical disclaimer
            return {
                "level": "AMBER",
                "rationale": [
                    "Response parsing failed - system error detected",
                    "Recommend medical evaluation for safety"
                ],
                "confidence": 0.0,
                "recommendations": ["Seek professional medical evaluation"],
                "medical_disclaimer": MedicalPromptTemplates.MEDICAL_DISCLAIMER,
                "parse_error": str(e),
                "fallback_used": True
            }
    
    def _validate_triage_fields(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize triage response fields."""
        # Validate triage level
        level = result.get("level", "").upper()
        if level not in ["RED", "AMBER", "GREEN"]:
            logger.warning(f"Invalid triage level '{level}', defaulting to AMBER")
            level = "AMBER"
        
        # Validate and clean rationale
        rationale = result.get("rationale", [])
        if isinstance(rationale, str):
            rationale = [rationale]
        elif not isinstance(rationale, list):
            rationale = ["Assessment completed"]
        
        # Filter out empty or invalid rationale items
        rationale = [r for r in rationale if isinstance(r, str) and r.strip()]
        if not rationale:
            rationale = ["Medical assessment completed"]
        
        # Validate confidence score
        confidence = result.get("confidence", 0.5)
        try:
            confidence = float(confidence)
            if not (0.0 <= confidence <= 1.0):
                confidence = 0.5
        except (ValueError, TypeError):
            confidence = 0.5
        
        # Validate recommendations
        recommendations = result.get("recommendations", [])
        if isinstance(recommendations, str):
            recommendations = [recommendations]
        elif not isinstance(recommendations, list):
            recommendations = ["Consult with healthcare professional"]
        
        # Ensure medical disclaimer is present
        medical_disclaimer = result.get("medical_disclaimer", MedicalPromptTemplates.MEDICAL_DISCLAIMER)
        
        return {
            "level": level,
            "rationale": rationale,
            "confidence": confidence,
            "recommendations": recommendations,
            "medical_disclaimer": medical_disclaimer
        }
    
    async def generate_diagnosis_summary(
        self,
        triage_result: Dict[str, Any],
        detections: List[Dict[str, Any]],
        symptoms: Optional[str] = None,
        body_part: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate patient-friendly diagnosis summary with enhanced medical communication.
        
        Args:
            triage_result: Result from triage assessment
            detections: Detection results
            symptoms: Patient symptoms (will be redacted for PHI)
            body_part: Detected body part for context
            
        Returns:
            Dict with comprehensive patient-friendly summary and guidance
        """
        start_time = time.time()
        request_id = f"diagnosis_{int(time.time() * 1000)}"
        
        try:
            if not self.is_initialized:
                self._initialize_client()
            
            logger.info(f"Starting diagnosis summary generation {request_id}")
            
            # Build enhanced prompt using templates
            user_prompt = MedicalPromptTemplates.build_diagnosis_prompt(
                triage_result=triage_result,
                detections=detections,
                symptoms=symptoms,
                body_part=body_part
            )
            
            # Use more capable model for patient communication
            response = await self._make_api_call(
                system_prompt=MedicalPromptTemplates.get_diagnosis_system_prompt(),
                user_prompt=user_prompt,
                model=self.diagnosis_model,
                request_id=request_id
            )
            
            # Parse and validate response
            urgency_level = triage_result.get("level", "AMBER")
            result = self._parse_diagnosis_response(response)

            # If parsing failed or summary is missing/generic, provide urgency-specific fallback
            summary_text = result.get("summary", "") if isinstance(result, dict) else ""
            if result.get("parse_error") or not summary_text or "technical issue" in summary_text.lower():
                fallback = self._generate_fallback_summary(urgency_level, detections)
                result = {**fallback, "fallback_used": True, "reason": "diagnosis_parse_failed"}
            
            # Add metadata
            result.update({
                "inference_time_ms": round((time.time() - start_time) * 1000, 2),
                "request_id": request_id,
                "model_used": self.diagnosis_model,
                "phi_redacted": bool(symptoms),
                "urgency_level": urgency_level
            })
            
            logger.info(f"Diagnosis summary {request_id} completed successfully")
            
            return result
            
        except Exception as e:
            logger.error(f"Diagnosis summary generation {request_id} failed: {e}")
            
            # Generate safe fallback based on triage level
            urgency_level = triage_result.get("level", "AMBER")
            fallback_summary = self._generate_fallback_summary(urgency_level, detections)
            
            return {
                **fallback_summary,
                "error": str(e),
                "inference_time_ms": round((time.time() - start_time) * 1000, 2),
                "request_id": request_id,
                "fallback_used": True
            }
    
    def _generate_fallback_summary(self, urgency_level: str, detections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate safe fallback summary when API calls fail."""
        
        urgency_messages = {
            "RED": {
                "summary": "Your X-ray analysis has been completed and shows findings that may require prompt medical attention. While our automated system encountered a technical issue, the initial assessment suggests you should seek medical care soon.",
                "next_steps": [
                    "Contact your healthcare provider or visit an urgent care center",
                    "Bring your X-ray images with you",
                    "Mention any pain, swelling, or difficulty moving the affected area"
                ],
                "timeline": "Seek medical attention within the next few hours"
            },
            "AMBER": {
                "summary": "Your X-ray analysis has been completed. While our system encountered a technical issue in generating the detailed explanation, the initial assessment suggests you should follow up with a healthcare professional.",
                "next_steps": [
                    "Schedule an appointment with your healthcare provider",
                    "Bring your X-ray images to the appointment",
                    "Discuss any symptoms you're experiencing"
                ],
                "timeline": "Schedule medical follow-up within the next day or two"
            },
            "GREEN": {
                "summary": "Your X-ray analysis has been completed. While our system encountered a technical issue, the initial assessment suggests no urgent concerns were detected.",
                "next_steps": [
                    "Consider routine follow-up with your healthcare provider if symptoms persist",
                    "Monitor your symptoms and seek care if they worsen",
                    "Keep your X-ray images for future reference"
                ],
                "timeline": "Routine follow-up as needed"
            }
        }
        
        message_set = urgency_messages.get(urgency_level, urgency_messages["AMBER"])
        
        # Add detection context if available
        detection_context = ""
        if detections:
            detection_context = f" Our analysis identified {len(detections)} area(s) of interest in your X-ray."
        
        return {
            "summary": message_set["summary"] + detection_context,
            "what_this_means": "Due to a technical issue, we cannot provide detailed analysis at this time, but your safety is our priority.",
            "next_steps": message_set["next_steps"],
            "timeline": message_set["timeline"],
            "when_to_seek_help": "Seek immediate medical attention if you experience severe pain, numbness, inability to move, or worsening symptoms.",
            "medical_disclaimer": MedicalPromptTemplates.MEDICAL_DISCLAIMER,
            "emergency_guidance": MedicalPromptTemplates.EMERGENCY_WARNING
        }
    
    def _parse_diagnosis_response(self, response: Any) -> Dict[str, Any]:
        """Parse and validate diagnosis response from Groq with enhanced field validation."""
        try:
            # Extract content from response
            if hasattr(response, 'choices') and response.choices:
                content = response.choices[0].message.content
            else:
                raise ValueError("Invalid response format from Groq API")
            
            # Parse JSON content with multiple fallback strategies
            import json
            import re
            
            result = None
            
            # Strategy 1: Direct JSON parsing
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                # Strategy 2: Extract JSON block from markdown or text
                json_patterns = [
                    r'```json\s*(\{.*?\})\s*```',  # JSON in code blocks
                    r'```\s*(\{.*?\})\s*```',      # Generic code blocks
                    r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}',  # Nested JSON objects
                ]
                
                for pattern in json_patterns:
                    matches = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)
                    for match in matches:
                        try:
                            result = json.loads(match)
                            break
                        except json.JSONDecodeError:
                            continue
                    if result:
                        break
                
                if not result:
                    raise ValueError("No valid JSON found in response")
            
            # Validate and sanitize the response
            validated_result = self._validate_diagnosis_fields(result)
            
            return validated_result
            
        except Exception as e:
            logger.error(f"Failed to parse diagnosis response: {e}")
            logger.debug(f"Raw response content: {getattr(response, 'choices', [{}])[0].message.content if hasattr(response, 'choices') else 'No content'}")
            
            # Return safe fallback
            return {
                "summary": "Your X-ray analysis is complete. Due to a technical issue, we cannot provide detailed results at this time. Please consult with a healthcare professional for comprehensive evaluation.",
                "what_this_means": "A healthcare professional can provide detailed interpretation of your X-ray findings.",
                "next_steps": ["Consult with a healthcare professional", "Bring your X-ray images to the appointment"],
                "timeline": "Schedule follow-up as recommended by your healthcare provider",
                "when_to_seek_help": "Seek immediate medical attention if you experience severe symptoms.",
                "medical_disclaimer": MedicalPromptTemplates.MEDICAL_DISCLAIMER,
                "emergency_guidance": MedicalPromptTemplates.EMERGENCY_WARNING,
                "parse_error": str(e),
                "fallback_used": True
            }
    
    def _validate_diagnosis_fields(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize diagnosis response fields."""
        
        # Validate summary
        summary = result.get("summary", "")
        if not isinstance(summary, str) or not summary.strip():
            summary = "Your X-ray analysis has been completed. Please consult with a healthcare professional for detailed results."
        
        # Validate what_this_means
        what_this_means = result.get("what_this_means", "")
        if not isinstance(what_this_means, str) or not what_this_means.strip():
            what_this_means = "A healthcare professional can provide detailed interpretation and guidance based on your specific situation."
        
        # Validate next_steps
        next_steps = result.get("next_steps", [])
        if isinstance(next_steps, str):
            next_steps = [next_steps]
        elif not isinstance(next_steps, list):
            next_steps = ["Consult with a healthcare professional"]
        
        # Filter and validate next_steps items
        next_steps = [step for step in next_steps if isinstance(step, str) and step.strip()]
        if not next_steps:
            next_steps = ["Consult with a healthcare professional", "Follow medical advice"]
        
        # Validate timeline
        timeline = result.get("timeline", "")
        if not isinstance(timeline, str) or not timeline.strip():
            timeline = "Follow up as recommended by your healthcare provider"
        
        # Validate when_to_seek_help
        when_to_seek_help = result.get("when_to_seek_help", "")
        if not isinstance(when_to_seek_help, str) or not when_to_seek_help.strip():
            when_to_seek_help = "Seek immediate medical attention if you experience severe pain, numbness, or worsening symptoms."
        
        # Ensure medical disclaimer and emergency guidance are present
        medical_disclaimer = result.get("medical_disclaimer", MedicalPromptTemplates.MEDICAL_DISCLAIMER)
        emergency_guidance = result.get("emergency_guidance", MedicalPromptTemplates.EMERGENCY_WARNING)
        
        return {
            "summary": summary,
            "what_this_means": what_this_means,
            "next_steps": next_steps,
            "timeline": timeline,
            "when_to_seek_help": when_to_seek_help,
            "medical_disclaimer": medical_disclaimer,
            "emergency_guidance": emergency_guidance
        }


# Global Groq service instance
groq_service = GroqService()