"""Orchestrator service for managing processing pipelines."""

import asyncio
from typing import Dict, List, Optional, Any, Callable
from uuid import UUID
from datetime import datetime
from loguru import logger

from app.config import config
from schemas.orchestrator import (
    StepGraph, ProcessingStep, StepName, StepStatus, ProcessingMode,
    ProcessingRequest, ProcessingResponse, GuidedPrompt
)
from schemas.base import BodyPart
from services.policies import policy_service


class OrchestratorService:
    """Service for orchestrating processing pipelines across different modes."""
    
    def __init__(self):
        self.active_requests: Dict[UUID, StepGraph] = {}
        self.step_handlers: Dict[StepName, Callable] = {}
    
    def register_step_handler(self, step_name: StepName, handler: Callable) -> None:
        """Register a handler for a specific step."""
        self.step_handlers[step_name] = handler
        logger.debug(f"Registered handler for step: {step_name}")
    
    async def process_request(self, request: ProcessingRequest) -> ProcessingResponse:
        """Process a request according to the specified mode."""
        # Create step graph
        step_graph = self._create_step_graph(request)
        self.active_requests[step_graph.request_id] = step_graph
        
        try:
            if request.mode == ProcessingMode.AUTO:
                await self._process_auto_mode(step_graph, request)
            elif request.mode == ProcessingMode.GUIDED:
                await self._process_guided_mode(step_graph, request)
            elif request.mode == ProcessingMode.ADVANCED:
                await self._process_advanced_mode(step_graph, request)
            
            return self._create_response(step_graph)
            
        except Exception as e:
            logger.error(f"Processing failed for request {step_graph.request_id}: {e}")
            # Mark current step as failed if any
            current_step = self._get_current_step(step_graph)
            if current_step and current_step.status == StepStatus.RUNNING:
                current_step.fail(str(e))
            raise
        finally:
            # Keep request in memory for status queries
            pass
    
    def _create_step_graph(self, request: ProcessingRequest) -> StepGraph:
        """Create initial step graph based on request mode."""
        # Get policy configuration for this request
        overrides = {}
        if request.router_threshold_override is not None:
            overrides['router_threshold'] = request.router_threshold_override
        if request.detector_score_override is not None:
            overrides['detector_score_min'] = request.detector_score_override
        if request.timeout_overrides:
            overrides['timeout_overrides'] = request.timeout_overrides
        
        policy_config = policy_service.get_config_for_request(
            request_id=UUID('00000000-0000-0000-0000-000000000000'),  # Temporary ID
            mode=request.mode,
            overrides=overrides if overrides else None
        )
        
        step_graph = StepGraph(
            mode=request.mode,
            config_hash=policy_config.config_hash,
            thresholds=policy_service.get_detection_thresholds(UUID('00000000-0000-0000-0000-000000000000')),
            timeouts=policy_service.get_config_metadata(UUID('00000000-0000-0000-0000-000000000000'))['timeouts']
        )
        
        # Update policy service with actual request ID
        policy_service.get_config_for_request(
            request_id=step_graph.request_id,
            mode=request.mode,
            overrides=overrides if overrides else None
        )
        
        # Add standard pipeline steps
        step_graph.add_step(StepName.VALIDATE)
        step_graph.add_step(StepName.ROUTE)
        
        # Detection steps will be added based on routing results
        step_graph.add_step(StepName.TRIAGE)
        step_graph.add_step(StepName.DIAGNOSE)
        step_graph.add_step(StepName.REPORT)
        
        # Optional steps
        if request.consents.get("geolocation", False):
            step_graph.add_step(StepName.HOSPITALS)
        
        return step_graph
    
    async def _process_auto_mode(self, step_graph: StepGraph, request: ProcessingRequest) -> None:
        """Process request in auto mode - full sequence with short-circuit on fatal errors."""
        logger.info(f"Processing request {step_graph.request_id} in AUTO mode")
        
        # Validation step
        await self._execute_step(step_graph, StepName.VALIDATE, request)
        if step_graph.has_fatal_error():
            logger.warning(f"Fatal error in validation, stopping processing")
            return
        
        # Routing step
        await self._execute_step(step_graph, StepName.ROUTE, request)
        if step_graph.has_fatal_error():
            logger.warning(f"Fatal error in routing, stopping processing")
            return
        
        # Add detection steps based on routing result
        route_step = step_graph.get_step(StepName.ROUTE)
        if route_step and route_step.status == StepStatus.OK:
            detected_part = step_graph.detected_body_part
            
            if detected_part == BodyPart.HAND:
                step_graph.add_step(StepName.DETECT_HAND)
                await self._execute_step(step_graph, StepName.DETECT_HAND, request)
            elif detected_part == BodyPart.LEG:
                step_graph.add_step(StepName.DETECT_LEG)
                await self._execute_step(step_graph, StepName.DETECT_LEG, request)
            elif detected_part == BodyPart.UNKNOWN:
                # Low confidence routing - run both detectors in auto mode
                step_graph.add_step(StepName.DETECT_HAND)
                step_graph.add_step(StepName.DETECT_LEG)
                await asyncio.gather(
                    self._execute_step(step_graph, StepName.DETECT_HAND, request),
                    self._execute_step(step_graph, StepName.DETECT_LEG, request),
                    return_exceptions=True
                )
        
        # Continue with remaining steps (allow partial results)
        await self._execute_step(step_graph, StepName.TRIAGE, request)
        await self._execute_step(step_graph, StepName.DIAGNOSE, request)
        await self._execute_step(step_graph, StepName.REPORT, request)
        
        # Optional hospitals step
        if step_graph.get_step(StepName.HOSPITALS):
            await self._execute_step(step_graph, StepName.HOSPITALS, request)
        
        # Check if we have partial results
        failed_steps = step_graph.get_failed_steps()
        if failed_steps and not step_graph.has_fatal_error():
            step_graph.partial = True
            logger.info(f"Request {step_graph.request_id} completed with partial results")
    
    async def _process_guided_mode(self, step_graph: StepGraph, request: ProcessingRequest) -> None:
        """Process request in guided mode - prompt when confidence < threshold or consent needed."""
        logger.info(f"Processing request {step_graph.request_id} in GUIDED mode")
        
        # Validation step (always run)
        await self._execute_step(step_graph, StepName.VALIDATE, request)
        if step_graph.has_fatal_error():
            return
        
        # Routing step
        await self._execute_step(step_graph, StepName.ROUTE, request)
        if step_graph.has_fatal_error():
            return
        
        # Check routing confidence
        route_step = step_graph.get_step(StepName.ROUTE)
        if route_step and route_step.confidence and route_step.confidence < step_graph.thresholds["router_threshold"]:
            # Create guided prompt for low confidence routing
            prompt = GuidedPrompt(
                step_name=StepName.ROUTE,
                prompt_type="low_confidence",
                message=f"Body part detection confidence is low ({route_step.confidence:.2f}). Which body part should be analyzed?",
                options=["hand", "leg", "both"],
                confidence=route_step.confidence
            )
            # In a real implementation, this would be returned to the client for user input
            # For now, we'll default to running both detectors
            logger.info(f"Low confidence routing, running both detectors")
            step_graph.detected_body_part = BodyPart.UNKNOWN
        
        # Add and execute detection steps
        detected_part = step_graph.detected_body_part
        if detected_part in [BodyPart.HAND, BodyPart.UNKNOWN]:
            step_graph.add_step(StepName.DETECT_HAND)
            await self._execute_step(step_graph, StepName.DETECT_HAND, request)
        
        if detected_part in [BodyPart.LEG, BodyPart.UNKNOWN]:
            step_graph.add_step(StepName.DETECT_LEG)
            await self._execute_step(step_graph, StepName.DETECT_LEG, request)
        
        # Check for consent requirements
        if step_graph.get_step(StepName.HOSPITALS) and not request.consents.get("geolocation", False):
            prompt = GuidedPrompt(
                step_name=StepName.HOSPITALS,
                prompt_type="consent_required",
                message="Hospital location service requires geolocation consent. Do you want to provide consent?",
                options=["yes", "no"]
            )
            # Skip hospitals step if no consent
            hospitals_step = step_graph.get_step(StepName.HOSPITALS)
            if hospitals_step:
                hospitals_step.skip("Geolocation consent not provided")
        
        # Continue with remaining steps
        await self._execute_step(step_graph, StepName.TRIAGE, request)
        await self._execute_step(step_graph, StepName.DIAGNOSE, request)
        await self._execute_step(step_graph, StepName.REPORT, request)
        
        if step_graph.get_step(StepName.HOSPITALS) and step_graph.get_step(StepName.HOSPITALS).status == StepStatus.PENDING:
            await self._execute_step(step_graph, StepName.HOSPITALS, request)
    
    async def _process_advanced_mode(self, step_graph: StepGraph, request: ProcessingRequest) -> None:
        """Process request in advanced mode - with custom thresholds and overrides."""
        logger.info(f"Processing request {step_graph.request_id} in ADVANCED mode")
        
        # Advanced mode allows custom configuration overrides
        # The thresholds and timeouts are already applied in _create_step_graph
        
        # Process similar to auto mode but with custom configuration
        await self._process_auto_mode(step_graph, request)
        
        logger.info(f"Advanced mode processing completed with custom config: {step_graph.thresholds}")
    
    async def _execute_step(self, step_graph: StepGraph, step_name: StepName, request: ProcessingRequest) -> None:
        """Execute a single step with timeout and retry logic."""
        step = step_graph.get_step(step_name)
        if not step:
            logger.error(f"Step {step_name} not found in step graph")
            return
        
        if step.status != StepStatus.PENDING:
            logger.debug(f"Step {step_name} already processed, skipping")
            return
        
        handler = self.step_handlers.get(step_name)
        if not handler:
            logger.warning(f"No handler registered for step {step_name}, skipping")
            step.skip("No handler available")
            return
        
        # Get timeout and retry policy from policy service
        timeout = policy_service.get_step_timeout(step_graph.request_id, step_name)
        
        attempt = 0
        while True:
            try:
                step.start()
                step.retry_count = attempt
                
                logger.debug(f"Executing step {step_name} (attempt {attempt + 1})")
                
                # Execute with timeout
                result = await asyncio.wait_for(
                    handler(request, step_graph),
                    timeout=timeout
                )
                
                # Handle result
                if isinstance(result, dict):
                    confidence = result.get("confidence")
                    artifacts = result.get("artifacts", {})
                    step.complete(confidence=confidence, artifacts=artifacts)
                    
                    # Update step graph with results
                    if step_name == StepName.ROUTE and "body_part" in result:
                        step_graph.detected_body_part = BodyPart(result["body_part"])
                    elif step_name == StepName.TRIAGE and "level" in result:
                        step_graph.triage_level = result["level"]
                else:
                    step.complete()
                
                logger.debug(f"Step {step_name} completed successfully")
                return
                
            except asyncio.TimeoutError:
                logger.warning(f"Step {step_name} timed out after {timeout}s")
                step.timeout()
                
                # Check if we should retry on timeout
                if policy_service.should_retry_step(step_graph.request_id, step_name, attempt, "timeout"):
                    attempt += 1
                    step.status = StepStatus.PENDING
                    step.started_at = None
                    step.completed_at = None
                    step.duration_ms = None
                    step.error_message = None
                    await asyncio.sleep(0.5)  # Brief delay before retry
                    continue
                else:
                    return
                
            except Exception as e:
                error_type = type(e).__name__
                logger.error(f"Step {step_name} failed (attempt {attempt + 1}): {e}")
                
                # Check if we should retry this error
                if policy_service.should_retry_step(step_graph.request_id, step_name, attempt, error_type):
                    attempt += 1
                    # Reset step for retry
                    step.status = StepStatus.PENDING
                    step.started_at = None
                    step.completed_at = None
                    step.duration_ms = None
                    step.error_message = None
                    await asyncio.sleep(0.5)  # Brief delay before retry
                    continue
                else:
                    step.fail(str(e))
                    
                    # Check if this is a fatal error that should stop processing
                    if policy_service.is_step_fatal_on_error(step_graph.request_id, step_name):
                        logger.error(f"Fatal error in step {step_name}, stopping pipeline")
                    return
    
    def _get_current_step(self, step_graph: StepGraph) -> Optional[ProcessingStep]:
        """Get the currently running step."""
        for step in step_graph.steps:
            if step.status == StepStatus.RUNNING:
                return step
        return None
    
    def _create_response(self, step_graph: StepGraph) -> ProcessingResponse:
        """Create response from completed step graph."""
        response = ProcessingResponse(
            request_id=step_graph.request_id,
            step_graph=step_graph
        )
        
        # Collect artifacts from all steps
        for step in step_graph.steps:
            response.artifacts.update(step.artifacts)
        
        return response
    
    def get_request_status(self, request_id: UUID) -> Optional[StepGraph]:
        """Get status of a processing request."""
        return self.active_requests.get(request_id)
    
    def cleanup_completed_requests(self, max_age_hours: int = 24) -> int:
        """Clean up old completed requests."""
        cutoff = datetime.utcnow().timestamp() - (max_age_hours * 3600)
        to_remove = []
        
        for request_id, step_graph in self.active_requests.items():
            if step_graph.is_complete() and step_graph.updated_at.timestamp() < cutoff:
                to_remove.append(request_id)
        
        for request_id in to_remove:
            del self.active_requests[request_id]
            # Clean up policy configuration for this request
            policy_service.cleanup_request_config(request_id)
        
        logger.info(f"Cleaned up {len(to_remove)} old requests")
        return len(to_remove)


# Global orchestrator instance
orchestrator = OrchestratorService()