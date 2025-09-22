"""Agent handlers for orchestrator step execution."""

from typing import Dict, Any
from loguru import logger

from schemas.orchestrator import ProcessingRequest, StepGraph, StepName, StepStatus
from agents.router import get_router_agent
from agents.hand import get_hand_agent
from agents.leg import get_leg_agent
from agents.triage import triage_agent


async def handle_route_step(request: ProcessingRequest, step_graph: StepGraph) -> Dict[str, Any]:
    """Handle routing step - classify body part."""
    try:
        router_agent = get_router_agent()
        
        # Route the image (in real implementation, would use request.image_url)
        # For now, use a mock image ID
        image_id = "file-" + request.image_url.split("/")[-1] if "/" in request.image_url else request.image_url
        
        result = await router_agent.route_image(image_id)
        
        logger.info(f"Routing completed: {result['body_part']} (confidence: {result['confidence']:.3f})")
        
        return {
            "body_part": result["body_part"],
            "confidence": result["confidence"],
            "artifacts": {
                "routing_result": image_id + "_routing"
            }
        }
        
    except Exception as e:
        logger.error(f"Routing step failed: {e}")
        raise


async def handle_detect_hand_step(request: ProcessingRequest, step_graph: StepGraph) -> Dict[str, Any]:
    """Handle hand detection step - detect fractures in hand X-rays."""
    try:
        hand_agent = get_hand_agent()
        
        # Get image ID from request (in real implementation, would fetch from storage)
        image_id = "file-" + request.image_url.split("/")[-1] if "/" in request.image_url else request.image_url
        
        result = await hand_agent.process_image(image_id)
        
        # Calculate overall confidence based on detections
        detections = result.get("detections", [])
        if detections:
            # Use highest confidence detection as overall confidence
            max_confidence = max(det["score"] for det in detections)
            avg_confidence = sum(det["score"] for det in detections) / len(detections)
            overall_confidence = (max_confidence + avg_confidence) / 2
        else:
            # No detections found - this could be normal (no fractures)
            overall_confidence = 0.8  # High confidence in "no fractures found"
        
        logger.info(f"Hand detection completed: {len(detections)} detections, confidence: {overall_confidence:.3f}")
        
        # Prepare artifacts for storage
        artifacts = {
            "detections_json": f"{image_id}_hand_detections",
            "original_image": image_id
        }
        
        if result.get("annotated_image_id"):
            artifacts["annotated_image"] = result["annotated_image_id"]
        
        return {
            "confidence": overall_confidence,
            "detections": detections,
            "inference_time_ms": result.get("inference_time_ms", 0),
            "artifacts": artifacts
        }
        
    except Exception as e:
        logger.error(f"Hand detection step failed: {e}")
        raise


async def handle_detect_leg_step(request: ProcessingRequest, step_graph: StepGraph) -> Dict[str, Any]:
    """Handle leg detection step - detect fractures in leg X-rays."""
    try:
        leg_agent = get_leg_agent()
        
        # Get image ID from request (in real implementation, would fetch from storage)
        image_id = "file-" + request.image_url.split("/")[-1] if "/" in request.image_url else request.image_url
        
        result = await leg_agent.process_image(image_id)
        
        # Calculate overall confidence based on detections
        detections = result.get("detections", [])
        if detections:
            # Use highest confidence detection as overall confidence
            max_confidence = max(det["score"] for det in detections)
            avg_confidence = sum(det["score"] for det in detections) / len(detections)
            overall_confidence = (max_confidence + avg_confidence) / 2
        else:
            # No detections found - this could be normal (no fractures)
            overall_confidence = 0.8  # High confidence in "no fractures found"
        
        logger.info(f"Leg detection completed: {len(detections)} detections, confidence: {overall_confidence:.3f}")
        
        # Prepare artifacts for storage
        artifacts = {
            "detections_json": f"{image_id}_leg_detections",
            "original_image": image_id
        }
        
        if result.get("annotated_image_id"):
            artifacts["annotated_image"] = result["annotated_image_id"]
        
        return {
            "confidence": overall_confidence,
            "detections": detections,
            "inference_time_ms": result.get("inference_time_ms", 0),
            "artifacts": artifacts
        }
        
    except Exception as e:
        logger.error(f"Leg detection step failed: {e}")
        raise


async def handle_validate_step(request: ProcessingRequest, step_graph: StepGraph) -> Dict[str, Any]:
    """Handle validation step - validate input parameters."""
    try:
        # Validate image URL
        if not request.image_url:
            raise ValueError("Image URL is required")
        
        # Validate consents if needed
        consents = request.consents or {}
        
        # Validate mode-specific parameters
        if request.mode.value == "advanced":
            # Advanced mode validation
            if request.router_threshold_override is not None:
                if not (0.0 <= request.router_threshold_override <= 1.0):
                    raise ValueError("Router threshold override must be between 0.0 and 1.0")
            
            if request.detector_score_override is not None:
                if not (0.0 <= request.detector_score_override <= 1.0):
                    raise ValueError("Detector score override must be between 0.0 and 1.0")
        
        logger.info("Validation step completed successfully")
        
        return {
            "confidence": 1.0,
            "artifacts": {
                "validation_result": "passed"
            }
        }
        
    except Exception as e:
        logger.error(f"Validation step failed: {e}")
        raise


async def handle_triage_step(request: ProcessingRequest, step_graph: StepGraph) -> Dict[str, Any]:
    """Handle triage step - classify urgency level based on detections and symptoms."""
    try:
        # Collect detections from previous steps
        all_detections = []
        upstream_partial = False
        
        # Get hand detections if available
        hand_step = step_graph.get_step(StepName.DETECT_HAND)
        if hand_step and hand_step.status == StepStatus.OK:
            hand_artifacts = hand_step.artifacts
            # In a real implementation, would load detections from storage
            # For now, simulate by checking if we have detection artifacts
            if "detections_json" in hand_artifacts:
                # Mock hand detections based on step success
                mock_hand_detections = [
                    {"label": "fracture", "score": 0.85, "bbox": [100, 150, 80, 60]},
                    {"label": "hairline_fracture", "score": 0.72, "bbox": [200, 180, 60, 40]}
                ]
                all_detections.extend(mock_hand_detections)
        elif hand_step and hand_step.status in [StepStatus.ERROR, StepStatus.TIMEOUT]:
            upstream_partial = True
        
        # Get leg detections if available
        leg_step = step_graph.get_step(StepName.DETECT_LEG)
        if leg_step and leg_step.status == StepStatus.OK:
            leg_artifacts = leg_step.artifacts
            if "detections_json" in leg_artifacts:
                # Mock leg detections based on step success
                mock_leg_detections = [
                    {"label": "displaced_fracture", "score": 0.91, "bbox": [150, 200, 100, 80]}
                ]
                all_detections.extend(mock_leg_detections)
        elif leg_step and leg_step.status in [StepStatus.ERROR, StepStatus.TIMEOUT]:
            upstream_partial = True
        
        # Get body part from routing step
        body_part = None
        route_step = step_graph.get_step(StepName.ROUTE)
        if route_step and route_step.status == StepStatus.OK:
            body_part = step_graph.detected_body_part if step_graph.detected_body_part else None
        
        # Process triage request
        result = await triage_agent.process_triage_request(
            detections=all_detections,
            symptoms=request.symptoms,
            body_part=body_part,
            upstream_partial=upstream_partial
        )
        
        logger.info(f"Triage completed: {result['level']} (confidence: {result['confidence']:.3f})")
        
        # Prepare artifacts
        artifacts = {
            "triage_result": f"triage_{step_graph.request_id}",
            "triage_method": result.get("method", "unknown")
        }
        
        return {
            "confidence": result["confidence"],
            "level": result["level"],
            "rationale": result["rationale"],
            "partial": result.get("partial", False),
            "method": result.get("method", "unknown"),
            "inference_time_ms": result.get("inference_time_ms", 0),
            "artifacts": artifacts
        }
        
    except Exception as e:
        logger.error(f"Triage step failed: {e}")
        # Triage should never block - return safe fallback
        return {
            "confidence": 0.0,
            "level": "AMBER",
            "rationale": ["Triage assessment failed, recommend medical evaluation"],
            "partial": True,
            "method": "error_fallback",
            "error": str(e),
            "inference_time_ms": 0,
            "artifacts": {
                "triage_result": f"triage_error_{step_graph.request_id}"
            }
        }


# Handler registry for easy registration
STEP_HANDLERS = {
    StepName.VALIDATE: handle_validate_step,
    StepName.ROUTE: handle_route_step,
    StepName.DETECT_HAND: handle_detect_hand_step,
    StepName.DETECT_LEG: handle_detect_leg_step,
    StepName.TRIAGE: handle_triage_step,
}


def register_all_handlers(orchestrator):
    """Register all agent handlers with the orchestrator."""
    for step_name, handler in STEP_HANDLERS.items():
        orchestrator.register_step_handler(step_name, handler)
        logger.debug(f"Registered handler for {step_name}")
    
    logger.info(f"Registered {len(STEP_HANDLERS)} step handlers")