"""Triage Agent for R/A/G classification of orthopedic findings."""

import asyncio
import time
from typing import Dict, List, Optional, Any
from uuid import UUID
from loguru import logger

from schemas.base import TriageLevel
from services.groq_service import groq_service
from services.policies import policy_service


class TriageAgent:
    """Agent for triaging orthopedic findings using rules and LLM assistance."""
    
    def __init__(self):
        """Initialize triage agent."""
        self.rules_enabled = True
        self.llm_fallback_enabled = True
        logger.info("TriageAgent initialized")
    
    async def assess(self, detections: List[Dict[str, Any]], diagnosis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess triage level based on detections and diagnosis using dynamic calculation.
        
        Args:
            detections: Detection results from AI models
            diagnosis: Diagnosis information
            
        Returns:
            Dict containing triage assessment
        """
        try:
            # Extract key information
            confidence = diagnosis.get("confidence", 0.0)
            primary_finding = diagnosis.get("primary_finding", "").lower()
            detection_count = len(detections)
            
            # Calculate dynamic triage score
            triage_score = self._calculate_triage_score(
                confidence=confidence,
                primary_finding=primary_finding,
                detections=detections,
                detection_count=detection_count
            )
            
            # Determine level based on calculated score
            level_info = self._score_to_level(triage_score)
            
            # Debug logging
            logger.info(f"Dynamic triage - Finding: '{primary_finding}', Confidence: {confidence:.1%}, Score: {triage_score:.3f}, Level: {level_info['level']}")
            
            return {
                "level": level_info["level"],
                "confidence": confidence,
                "recommendation": level_info["recommendation"],
                "priority": level_info["priority"],
                "rationale": f"Triage score: {triage_score:.3f} based on {primary_finding} (confidence: {confidence:.1%})",
                "body_part": diagnosis.get("body_part", "unknown"),
                "triage_score": triage_score,
                "timestamp": time.time()
            }
            
        except Exception as e:
            logger.error(f"Dynamic triage assessment failed: {e}")
            return {
                "level": "AMBER",
                "confidence": 0.3,
                "recommendation": "Seek medical evaluation due to assessment error",
                "priority": "moderate",
                "error": str(e),
                "triage_score": 0.5
            }
    
    def _calculate_triage_score(
        self, 
        confidence: float, 
        primary_finding: str, 
        detections: List[Dict[str, Any]], 
        detection_count: int
    ) -> float:
        """
        Calculate dynamic triage score based on multiple factors.
        Score range: 0.0 (GREEN) to 1.0 (RED)
        
        Args:
            confidence: Detection confidence (0.0 to 1.0)
            primary_finding: Primary finding text
            detections: List of all detections
            detection_count: Number of detections
            
        Returns:
            Triage score (0.0 to 1.0)
        """
        base_score = 0.0
        
        # Factor 1: Detection confidence (0.0 to 0.6 weight)
        confidence_score = confidence * 0.6
        
        # Factor 2: Severity keywords (0.0 to 0.3 weight)
        severity_score = self._calculate_severity_score(primary_finding)
        
        # Factor 3: Detection count factor (0.0 to 0.1 weight)
        count_factor = min(detection_count * 0.02, 0.1)  # More detections = slightly higher score
        
        # Factor 4: Multiple high-confidence detections bonus
        high_conf_detections = sum(1 for d in detections if d.get("score", 0) > 0.7)
        multi_detection_bonus = min(high_conf_detections * 0.05, 0.1)
        
        # Combine all factors
        total_score = confidence_score + severity_score + count_factor + multi_detection_bonus
        
        # Ensure score stays in valid range
        return max(0.0, min(1.0, total_score))
    
    def _calculate_severity_score(self, primary_finding: str) -> float:
        """
        Calculate severity score based on finding keywords.
        
        Args:
            primary_finding: Primary finding text (lowercase)
            
        Returns:
            Severity score (0.0 to 0.3)
        """
        # Critical severity indicators (0.25-0.3)
        if any(keyword in primary_finding for keyword in [
            "compound", "open", "severe", "displaced", "comminuted", "avulsion"
        ]):
            return 0.3
        
        # High severity indicators (0.15-0.25)
        if any(keyword in primary_finding for keyword in [
            "fracture detected", "break", "crack", "confirmed fracture"
        ]):
            return 0.2
        
        # Medium severity indicators (0.05-0.15)
        if any(keyword in primary_finding for keyword in [
            "likely fracture", "probable fracture", "suspected fracture"
        ]):
            return 0.1
        
        # Low severity indicators (0.0-0.05)
        if any(keyword in primary_finding for keyword in [
            "possible fracture", "minor", "hairline", "stress"
        ]):
            return 0.05
        
        # No findings (0.0)
        if any(keyword in primary_finding for keyword in [
            "no fractures", "no fracture", "normal", "clear", "negative"
        ]):
            return 0.0
        
        # Unknown findings (conservative estimate)
        return 0.1
    
    def _score_to_level(self, score: float) -> Dict[str, str]:
        """
        Convert triage score to level, recommendation, and priority.
        
        Args:
            score: Triage score (0.0 to 1.0)
            
        Returns:
            Dict with level, recommendation, and priority
        """
        if score >= 0.75:  # High urgency
            return {
                "level": "RED",
                "recommendation": "Seek immediate emergency medical attention",
                "priority": "immediate"
            }
        elif score >= 0.4:  # Medium urgency
            return {
                "level": "AMBER", 
                "recommendation": "Seek medical attention within 24-48 hours",
                "priority": "urgent"
            }
        else:  # Low urgency
            return {
                "level": "GREEN",
                "recommendation": "Schedule routine medical evaluation if concerned",
                "priority": "non-urgent"
            }
        """
        Quick triage assessment for urgent cases.
        
        Args:
            image_data: Raw image bytes
            symptoms: Optional symptoms
            priority: High priority flag
            
        Returns:
            Dict containing quick assessment
        """
        try:
            # If high priority, default to urgent
            if priority:
                return {
                    "level": "RED",
                    "priority": "immediate",
                    "recommendation": "Seek immediate emergency care",
                    "confidence": 0.8,
                    "quick_assessment": True
                }
            
            # Basic assessment based on symptoms
            if symptoms:
                symptoms_lower = symptoms.lower()
                if any(word in symptoms_lower for word in ["severe", "intense", "unbearable", "emergency"]):
                    level = "RED"
                    priority = "immediate"
                elif any(word in symptoms_lower for word in ["moderate", "significant", "concerning"]):
                    level = "AMBER"
                    priority = "urgent"
                else:
                    level = "GREEN"
                    priority = "non-urgent"
            else:
                level = "AMBER"
                priority = "moderate"
            
            return {
                "level": level,
                "priority": priority,
                "recommendation": f"Based on quick assessment: {level} priority",
                "confidence": 0.6,
                "quick_assessment": True,
                "symptoms_provided": bool(symptoms)
            }
            
        except Exception as e:
            logger.error(f"Quick triage failed: {e}")
            return {
                "level": "AMBER",
                "priority": "moderate",
                "recommendation": "Seek medical evaluation",
                "confidence": 0.3,
                "error": str(e)
            }
    
    async def assess_from_symptoms(self, symptoms: str, findings: Dict[str, Any], age: Optional[int] = None) -> Dict[str, Any]:
        """
        Assess triage level from symptoms and findings.
        
        Args:
            symptoms: Patient symptoms
            findings: Additional findings
            age: Patient age
            
        Returns:
            Dict containing assessment
        """
        try:
            symptoms_lower = symptoms.lower()
            
            # Age-based risk factors
            age_factor = 1.0
            if age:
                if age > 65:
                    age_factor = 1.2  # Higher risk for elderly
                elif age < 18:
                    age_factor = 1.1  # Slightly higher concern for children
            
            # Symptom-based assessment
            severity_score = 0
            
            if any(word in symptoms_lower for word in ["severe", "excruciating", "unbearable"]):
                severity_score += 3
            elif any(word in symptoms_lower for word in ["moderate", "significant"]):
                severity_score += 2
            elif any(word in symptoms_lower for word in ["mild", "slight"]):
                severity_score += 1
            
            if any(word in symptoms_lower for word in ["deformed", "bent", "crooked", "displaced"]):
                severity_score += 3
            
            if any(word in symptoms_lower for word in ["swelling", "bruising", "discoloration"]):
                severity_score += 1
            
            # Apply age factor
            final_score = severity_score * age_factor
            
            # Determine level
            if final_score >= 4:
                level = "RED"
                priority = "immediate"
            elif final_score >= 2:
                level = "AMBER"
                priority = "urgent"
            else:
                level = "GREEN"
                priority = "non-urgent"
            
            return {
                "level": level,
                "priority": priority,
                "confidence": min(0.7, 0.4 + (severity_score * 0.1)),
                "severity_score": final_score,
                "age_factor": age_factor,
                "recommendation": f"Triage level {level} based on symptom assessment"
            }
            
        except Exception as e:
            logger.error(f"Symptom-based triage failed: {e}")
            return {
                "level": "AMBER",
                "priority": "moderate",
                "confidence": 0.3,
                "error": str(e),
                "recommendation": "Seek medical evaluation"
            }
    
    async def classify_urgency(
        self,
        detections: List[Dict[str, Any]],
        symptoms: Optional[str] = None,
        body_part: Optional[str] = None,
        request_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Classify urgency level based on detections and symptoms.
        
        Args:
            detections: List of detection results from YOLO models
            symptoms: Optional patient-reported symptoms
            body_part: Detected body part (hand/leg)
            
        Returns:
            Dict with level, rationale, confidence, and metadata
        """
        start_time = time.time()
        
        try:
            # Get triage configuration
            triage_config = policy_service.get_triage_config(request_id)
            
            # First try dynamic rule-based classification (no hardcoded patterns)
            rule_result = self._apply_dynamic_rules(detections, symptoms, body_part, triage_config)
            
            # If rules give high confidence, use that result
            if rule_result["confidence"] >= triage_config["high_confidence_threshold"]:
                logger.info(f"High-confidence rule-based triage: {rule_result['level']}")
                rule_result["method"] = "rules"
                rule_result["inference_time_ms"] = round((time.time() - start_time) * 1000, 2)
                return rule_result
            
            # Otherwise, use LLM for more nuanced assessment
            if self.llm_fallback_enabled:
                logger.debug("Using LLM for triage assessment")
                llm_result = await groq_service.generate_triage_assessment(
                    detections=detections,
                    symptoms=symptoms,
                    body_part=body_part
                )
                
                # Combine rule and LLM insights
                combined_result = self._combine_assessments(rule_result, llm_result)
                combined_result["method"] = "combined"
                combined_result["inference_time_ms"] = round((time.time() - start_time) * 1000, 2)
                
                return combined_result
            else:
                # Fall back to rule result
                rule_result["method"] = "rules_fallback"
                rule_result["inference_time_ms"] = round((time.time() - start_time) * 1000, 2)
                return rule_result
                
        except Exception as e:
            logger.error(f"Triage classification failed: {e}")
            # Return safe fallback - never block the pipeline
            return {
                "level": "AMBER",
                "rationale": ["Triage assessment failed, recommend medical evaluation"],
                "confidence": 0.0,
                "method": "fallback",
                "error": str(e),
                "inference_time_ms": round((time.time() - start_time) * 1000, 2),
                "partial": True
            }
    
    def _apply_dynamic_rules(
        self,
        detections: List[Dict[str, Any]],
        symptoms: Optional[str] = None,
        body_part: Optional[str] = None,
        triage_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Apply dynamic rule-based triage classification without hardcoded patterns."""
        
        logger.info(f"Applying dynamic rules to {len(detections)} detections")
        
        if not detections:
            # No detections - use dynamic scoring for consistency
            logger.info(f"No detections found, checking symptoms: {symptoms}")
            
            # Calculate score for no detections case
            severity_score = 0.0  # No detections = low severity
            symptom_score = 0.0
            
            if symptoms and self._has_severe_symptoms(symptoms):
                symptom_score = 0.3  # Severe symptoms boost score
                logger.info("Severe symptoms detected")
            
            total_score = severity_score + symptom_score
            level_info = self._score_to_level(total_score)
            
            logger.info(f"No detection triage - Score: {total_score:.3f}, Level: {level_info['level']}")
            
            return {
                "level": level_info["level"],
                "rationale": ["No fractures detected"] + (["Concerning symptoms reported"] if symptom_score > 0 else ["No concerning symptoms"]),
                "confidence": 0.8
            }
        
        # Use dynamic scoring for detection analysis
        logger.info(f"Analyzing {len(detections)} detections dynamically")
        
        # Calculate overall triage score based on all detections
        total_triage_score = 0.0
        max_confidence = 0.0
        rationale = []
        
        for detection in detections:
            raw_label = detection.get("label", "")
            label = raw_label.lower()
            
            # Get confidence score
            score = detection.get("score")
            if score is None:
                score = detection.get("confidence", 0.0)
            
            max_confidence = max(max_confidence, score)
            
            # Calculate this detection's contribution to triage score
            detection_severity = self._calculate_severity_score(label)
            detection_contribution = (score * 0.7) + (detection_severity * 0.3)
            
            # Take the maximum contribution (most severe detection drives triage)
            total_triage_score = max(total_triage_score, detection_contribution)
            
            rationale.append(f"{raw_label} detected (confidence: {score:.2f})")
            
            logger.info(f"Detection: {raw_label}, score: {score:.3f}, severity: {detection_severity:.3f}, contribution: {detection_contribution:.3f}")
        
        # Add symptom factor if present
        if symptoms and self._has_severe_symptoms(symptoms):
            total_triage_score = min(1.0, total_triage_score + 0.1)
            rationale.append("Concerning symptoms reported")
        
        # Convert score to level
        level_info = self._score_to_level(total_triage_score)
        
        logger.info(f"Final triage score: {total_triage_score:.3f}, Level: {level_info['level']}")
        
        return {
            "level": level_info["level"],
            "rationale": rationale,
            "confidence": max_confidence,
            "triage_score": total_triage_score,
            "method": "dynamic_scoring"
        }

    def _apply_rules(
        self,
        detections: List[Dict[str, Any]],
        symptoms: Optional[str] = None,
        body_part: Optional[str] = None,
        triage_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Apply rule-based triage classification."""
        
        # Use default config if none provided
        if triage_config is None:
            triage_config = policy_service.get_triage_config()
        
        red_patterns = triage_config["red_patterns"]
        amber_patterns = triage_config["amber_patterns"]
        green_patterns = triage_config["green_patterns"]
        
        if not detections:
            # No detections - use dynamic scoring for consistency
            logger.info(f"No detections found, checking symptoms: {symptoms}")
            
            # Calculate score for no detections case
            severity_score = 0.0  # No detections = low severity
            symptom_score = 0.0
            
            if symptoms and self._has_severe_symptoms(symptoms):
                symptom_score = 0.3  # Severe symptoms boost score
                logger.info("Severe symptoms detected")
            
            total_score = severity_score + symptom_score
            level_info = self._score_to_level(total_score)
            
            logger.info(f"No detection triage - Score: {total_score:.3f}, Level: {level_info['level']}")
            
            return {
                "level": level_info["level"],
                "rationale": ["No fractures detected"] + (["Concerning symptoms reported"] if symptom_score > 0 else ["No concerning symptoms"]),
                "confidence": triage_config.get("no_detection_confidence", 0.8)
            }
        
        # Analyze detections with confidence-based severity determination
        max_severity_level = "GREEN"
        max_confidence = 0.0
        rationale = []
        
        # Track weighted severity scores based on confidence
        severity_scores = {"RED": 0.0, "AMBER": 0.0, "GREEN": 0.0}
        detection_count = {"RED": 0, "AMBER": 0, "GREEN": 0}
        
        for detection in detections:
            raw_label = detection.get("label", "")
            label = raw_label.lower()
            # Normalize label for matching: convert spaces/hyphens to underscores
            normalized_label = label.replace(" ", "").replace("-", "")
            # Normalize confidence: prefer 'score', fallback to 'confidence'
            score = detection.get("score")
            if score is None:
                score = detection.get("confidence", 0.0)
            
            # Determine base severity category from patterns using normalized label
            base_severity = None
            if any(pattern in normalized_label for pattern in red_patterns):
                base_severity = "RED"
                rationale.append(f"Severe injury detected: {raw_label} (confidence: {score:.2f})")
            elif any(pattern in normalized_label for pattern in green_patterns):
                base_severity = "GREEN"
                rationale.append(f"Minor injury detected: {raw_label} (confidence: {score:.2f})")
            elif any(pattern in normalized_label for pattern in amber_patterns):
                base_severity = "AMBER"
                rationale.append(f"Moderate injury detected: {raw_label} (confidence: {score:.2f})")
            else:
                # Unknown detection type - treat as amber
                base_severity = "AMBER"
                rationale.append(f"Injury detected: {raw_label} (confidence: {score:.2f})")
        
            # Weight the severity by detection confidence
            confidence_weight = score
            severity_scores[base_severity] += confidence_weight
            detection_count[base_severity] += 1
            
            # Track maximum confidence for overall assessment
            if score > max_confidence:
                max_confidence = score
        
        # Determine final severity based on confidence-weighted scores and patterns
        red_threshold = triage_config["red_threshold"]
        amber_threshold = triage_config["amber_threshold"]
        
        # Logic: Higher confidence should lead to higher severity
        # For any fracture detection with high confidence, escalate severity
        
        if severity_scores["RED"] > 0:
            # RED patterns detected
            if max_confidence >= red_threshold:
                max_severity_level = "RED"
            elif max_confidence >= amber_threshold:
                max_severity_level = "AMBER"  # Medium confidence RED becomes AMBER
            else:
                max_severity_level = "AMBER"  # Even low confidence RED is at least AMBER
        elif severity_scores["AMBER"] > 0:
            # AMBER patterns detected
            if max_confidence >= red_threshold:
                max_severity_level = "RED"  # High confidence AMBER escalates to RED
            elif max_confidence >= amber_threshold:
                max_severity_level = "AMBER"
            else:
                max_severity_level = "GREEN"  # Low confidence AMBER becomes GREEN
        else:
            # GREEN patterns or unknown
            if max_confidence >= red_threshold:
                # Do not escalate GREEN directly to RED; cap at AMBER for responsible triage
                max_severity_level = "AMBER"
            elif max_confidence >= amber_threshold:
                max_severity_level = "AMBER"  # High confidence GREEN becomes AMBER
            else:
                max_severity_level = "GREEN"
        
        # Apply additional rules based on detection patterns
        # Multiple fractures increase severity
        total_detections = len(detections)
        if total_detections >= 3:
            if max_severity_level != "RED":
                max_severity_level = "AMBER" if max_severity_level == "GREEN" else "RED"
                rationale.append("Multiple fractures detected")
        elif total_detections >= 2 and max_severity_level == "GREEN":
            max_severity_level = "AMBER"
            rationale.append("Multiple injuries detected")
        
        # High-confidence detections boost overall confidence
        high_conf_threshold = triage_config["high_confidence_threshold"]
        high_conf_detections = [d for d in detections if (d.get("confidence") or d.get("score", 0)) > high_conf_threshold]
        confidence_boost_per_detection = triage_config.get("confidence_boost_per_detection", 0.05)
        confidence_boost = len(high_conf_detections) * confidence_boost_per_detection
        
        # Update max_confidence with boost but don't exceed 1.0
        boosted_confidence = min(max_confidence + confidence_boost, 1.0)
        
        # Check symptoms for additional context
        if symptoms:
            if self._has_severe_symptoms(symptoms):
                if max_severity_level == "GREEN":
                    max_severity_level = "AMBER"
                rationale.append("Severe symptoms reported")
            elif self._has_moderate_symptoms(symptoms):
                rationale.append("Moderate symptoms reported")
        
        # Ensure we have rationale
        if not rationale:
            rationale = [f"Assessment based on {total_detections} detection(s)"]
        
        # Calculate final confidence based on detection quality and consistency
        final_confidence = self._calculate_rule_confidence(
            detections, max_severity_level, boosted_confidence, triage_config
        )
        
        # The confidence should be derived from max detection score and rule weightings
        # Higher detection confidence leads to higher triage confidence
        default_confidence = triage_config.get("default_confidence", 0.8)
        confidence_from_detections = boosted_confidence if detections else default_confidence
        
        # Combine rule-based confidence with detection confidence
        combined_confidence = (final_confidence + confidence_from_detections) / 2
        
        return {
            "level": max_severity_level,
            "rationale": rationale,
            "confidence": min(combined_confidence, 1.0),
            "max_detection_score": boosted_confidence,
            "severity_breakdown": {
                "red_score": severity_scores["RED"],
                "amber_score": severity_scores["AMBER"], 
                "green_score": severity_scores["GREEN"],
                "total_weighted_score": (severity_scores["RED"] * 3.0 + 
                                       severity_scores["AMBER"] * 2.0 + 
                                       severity_scores["GREEN"] * 1.0) if total_detections > 0 else 0.0
            },
            "recommendations": self._default_recommendations(max_severity_level)
        }
    
    def _has_severe_symptoms(self, symptoms: str) -> bool:
        """Check if symptoms indicate severe condition."""
        if not symptoms:
            return False
        
        symptoms_lower = symptoms.lower()
        severe_keywords = [
            "severe pain", "intense pain", "unbearable", "excruciating",
            "deformity", "bone visible", "bleeding", "numbness",
            "tingling", "can't move", "unable to bear weight"
        ]
        
        return any(keyword in symptoms_lower for keyword in severe_keywords)
    
    def _has_moderate_symptoms(self, symptoms: str) -> bool:
        """Check if symptoms indicate moderate condition."""
        if not symptoms:
            return False
        
        symptoms_lower = symptoms.lower()
        moderate_keywords = [
            "pain", "swelling", "bruising", "stiffness",
            "difficulty moving", "tender", "sore"
        ]
        
        return any(keyword in symptoms_lower for keyword in moderate_keywords)
    
    def _calculate_rule_confidence(
        self,
        detections: List[Dict[str, Any]],
        level: str,
        max_detection_score: float,
        triage_config: Optional[Dict[str, Any]] = None
    ) -> float:
        """Calculate confidence for rule-based classification."""
        
        if not detections:
            return triage_config.get("no_detection_rule_confidence", 0.8)
        
        # Use default config if none provided
        if triage_config is None:
            triage_config = policy_service.get_triage_config()
        
        red_patterns = triage_config["red_patterns"]
        amber_patterns = triage_config["amber_patterns"]
        green_patterns = triage_config["green_patterns"]
        
        # Base confidence from detection scores
        avg_score = sum(d.get("score", 0) for d in detections) / len(detections)
        base_confidence = (avg_score + max_detection_score) / 2
        
        # Adjust based on consistency
        detection_labels = [d.get("label", "") for d in detections]
        
        # Check if all detections point to same severity level
        red_detections = sum(1 for label in detection_labels 
                           if any(pattern in label.lower() for pattern in red_patterns))
        amber_detections = sum(1 for label in detection_labels 
                             if any(pattern in label.lower() for pattern in amber_patterns))
        green_detections = sum(1 for label in detection_labels 
                             if any(pattern in label.lower() for pattern in green_patterns))
        
        total = len(detections)
        
        # High consistency increases confidence (use configurable thresholds)
        consistency_threshold = triage_config.get("consistency_threshold", 0.7)
        consistency_boost = triage_config.get("consistency_boost", 0.15)
        
        if level == "RED" and red_detections / total > consistency_threshold:
            base_confidence += consistency_boost + 0.05  # Extra boost for RED consistency
        elif level == "AMBER" and amber_detections / total > consistency_threshold:
            base_confidence += consistency_boost
        elif level == "GREEN" and green_detections / total > consistency_threshold:
            base_confidence += consistency_boost
        
        # Mixed severity levels decrease confidence
        severity_types = sum([1 for count in [red_detections, amber_detections, green_detections] if count > 0])
        if severity_types > 1:
            base_confidence -= triage_config.get("mixed_severity_penalty", 0.1)
        
        return max(0.0, min(1.0, base_confidence))
    
    def _combine_assessments(
        self,
        rule_result: Dict[str, Any],
        llm_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Combine rule-based and LLM assessments."""
        
        rule_level = rule_result.get("level", "AMBER")
        llm_level = llm_result.get("level", "AMBER")
        
        rule_confidence = rule_result.get("confidence", 0.0)
        llm_confidence = llm_result.get("confidence", 0.0)
        
        # Priority order: RED > AMBER > GREEN
        level_priority = {"RED": 3, "AMBER": 2, "GREEN": 1}
        
        # Choose the higher priority level
        if level_priority.get(rule_level, 2) >= level_priority.get(llm_level, 2):
            final_level = rule_level
            primary_source = "rules"
        else:
            final_level = llm_level
            primary_source = "llm"
        
        # Combine rationale
        rule_rationale = rule_result.get("rationale", [])
        llm_rationale = llm_result.get("rationale", [])
        
        combined_rationale = []
        if primary_source == "rules":
            combined_rationale.extend(rule_rationale)
            # Add LLM insights if they add value
            for reason in llm_rationale:
                if reason not in combined_rationale:
                    combined_rationale.append(reason)
        else:
            combined_rationale.extend(llm_rationale)
            # Add rule insights
            for reason in rule_rationale:
                if reason not in combined_rationale:
                    combined_rationale.append(reason)
        
        # Calculate combined confidence
        # Weight by agreement between methods
        if rule_level == llm_level:
            # Agreement increases confidence
            combined_confidence = min(1.0, (rule_confidence + llm_confidence) / 2 + 0.1)
        else:
            # Disagreement decreases confidence
            combined_confidence = max(rule_confidence, llm_confidence) * 0.8
        
        return {
            "level": final_level,
            "rationale": combined_rationale,
            "confidence": combined_confidence,
            "rule_assessment": {
                "level": rule_level,
                "confidence": rule_confidence
            },
            "llm_assessment": {
                "level": llm_level,
                "confidence": llm_confidence
            }
        }
    
    async def process_triage_request(
        self,
        detections: List[Dict[str, Any]],
        symptoms: Optional[str] = None,
        body_part: Optional[str] = None,
        upstream_partial: bool = False,
        request_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Process triage request with full error handling and partial result support.
        
        Args:
            detections: Detection results from hand/leg agents
            symptoms: Optional patient symptoms
            body_part: Detected body part
            upstream_partial: Whether upstream processing had partial results
            
        Returns:
            Triage result that never blocks the pipeline
        """
        try:
            result = await self.classify_urgency(detections, symptoms, body_part, request_id)
            
            # Mark as partial if upstream was partial or if we had errors
            if upstream_partial or result.get("error"):
                result["partial"] = True
            
            # Ensure medical disclaimer is included
            result["medical_disclaimer"] = (
                "⚠ This triage assessment is for informational purposes only. "
                "Always seek professional medical evaluation for any injury or health concern."
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Triage processing failed: {e}")
            # Never block - always return a result
            return {
                "level": "AMBER",
                "rationale": ["Triage assessment unavailable, recommend medical evaluation"],
                "confidence": 0.0,
                "partial": True,
                "error": str(e),
                "method": "error_fallback",
                "medical_disclaimer": (
                    "⚠ This triage assessment is for informational purposes only. "
                    "Always seek professional medical evaluation for any injury or health concern."
                )
            }

    def _default_recommendations(self, level: str) -> List[str]:
        """Provide level-specific default recommendations."""
        if level == "RED":
            return [
                "Seek urgent medical attention (ER/urgent care)",
                "Immobilize the affected area and avoid weight bearing",
                "Bring X-ray images and any reports to the appointment"
            ]
        if level == "AMBER":
            return [
                "Schedule an appointment within 24-48 hours",
                "Limit activity and consider immobilization until evaluated",
                "Use pain control as advised by a clinician"
            ]
        # GREEN
        return [
            "Consider routine follow-up if symptoms persist",
            "Resume activities as tolerated and monitor for worsening",
            "Seek care if pain, numbness, or function worsens"
        ]


# Global triage agent instance
triage_agent = TriageAgent()