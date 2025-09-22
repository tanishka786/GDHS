"""Router Agent for body-part classification."""

import asyncio
import time
from typing import Dict, Any, Optional, Union, TYPE_CHECKING
from pathlib import Path
from PIL import Image
import io
import base64
from loguru import logger

from schemas.base import BodyPart

# Try to import torch, fall back to mock if not available
try:
    import torch
    import torchvision.transforms as transforms
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    transforms = None

# Type hints for when torch is not available
if TYPE_CHECKING:
    from typing import Any as TensorType
else:
    if TORCH_AVAILABLE:
        TensorType = torch.Tensor
    else:
        TensorType = Any


class RouterAgent:
    """Body-part classifier agent for routing images to appropriate detectors."""
    
    def __init__(self, model_path: Optional[Path] = None):
        """Initialize router agent with model."""
        if model_path is None:
            try:
                from app.config import config
                self.model_path = config.router_model_path
            except:
                # Fallback for testing
                self.model_path = Path("models/router.pt")
        else:
            self.model_path = model_path
        self.model = None
        self.is_loaded = False
        
        if TORCH_AVAILABLE:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            # Image preprocessing pipeline
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
        else:
            self.device = "cpu"
            self.transform = None
            logger.warning("PyTorch not available, using mock implementation")
        
        # Class mapping for body parts
        self.class_mapping = {
            0: BodyPart.HAND,
            1: BodyPart.LEG,
            2: BodyPart.UNKNOWN
        }
        
        logger.info(f"RouterAgent initialized with model path: {self.model_path}")
    
    async def load_model(self) -> None:
        """Load the router model asynchronously."""
        if self.is_loaded:
            return
        
        try:
            if not TORCH_AVAILABLE or not self.model_path.exists():
                logger.warning(f"Router model not found or PyTorch unavailable, using mock model")
                self.model = self._create_mock_model()
            else:
                # Load actual PyTorch model
                self.model = torch.load(self.model_path, map_location=self.device)
                self.model.eval()
                logger.info(f"Loaded router model from {self.model_path}")
            
            # Warmup the model with a dummy input
            await self._warmup_model()
            self.is_loaded = True
            
        except Exception as e:
            logger.error(f"Failed to load router model: {e}")
            # Fall back to mock model for development
            self.model = self._create_mock_model()
            self.is_loaded = True
    
    def _create_mock_model(self):
        """Create a mock model for development/testing."""
        if TORCH_AVAILABLE:
            class MockRouterModel(torch.nn.Module):
                def __init__(self):
                    super().__init__()
                    self.classifier = torch.nn.Linear(3 * 224 * 224, 3)  # 3 classes: hand, leg, unknown
                
                def forward(self, x):
                    # Flatten input and pass through classifier
                    x = x.view(x.size(0), -1)
                    return self.classifier(x)
            
            model = MockRouterModel()
            model.eval()
            logger.info("Created mock PyTorch router model for development")
            return model
        else:
            # Simple mock model without PyTorch
            class SimpleMockModel:
                def __init__(self):
                    self.eval_mode = True
                
                def eval(self):
                    self.eval_mode = True
                
                def __call__(self, x):
                    # Return mock logits for 3 classes
                    import random
                    # Simulate different confidence levels for testing
                    rand_val = random.random()
                    if rand_val < 0.4:  # 40% chance of hand
                        return [[2.5, 0.5, 0.1]]  # High confidence hand
                    elif rand_val < 0.7:  # 30% chance of leg  
                        return [[0.3, 2.8, 0.2]]  # High confidence leg
                    else:  # 30% chance of uncertain
                        return [[1.1, 1.0, 1.2]]  # Low confidence/uncertain
            
            model = SimpleMockModel()
            logger.info("Created simple mock router model (no PyTorch)")
            return model
    
    async def _warmup_model(self) -> None:
        """Warmup model with dummy input to optimize inference speed."""
        try:
            dummy_input = torch.randn(1, 3, 224, 224).to(self.device)
            with torch.no_grad():
                _ = self.model(dummy_input)
            logger.debug("Router model warmed up successfully")
        except Exception as e:
            logger.warning(f"Model warmup failed: {e}")
    
    def _preprocess_image(self, image_data: bytes) -> TensorType:
        """Preprocess image data for model input."""
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Apply transforms
            tensor = self.transform(image)
            
            # Add batch dimension
            tensor = tensor.unsqueeze(0).to(self.device)
            
            return tensor
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            raise ValueError(f"Failed to preprocess image: {e}")
    
    def _postprocess_output(self, model_output: TensorType) -> Dict[str, Any]:
        """Postprocess model output to get body part and confidence."""
        try:
            # Apply softmax to get probabilities
            probabilities = torch.softmax(model_output, dim=1)
            
            # Get predicted class and confidence
            confidence, predicted_class = torch.max(probabilities, 1)
            
            # Convert to Python types
            predicted_idx = predicted_class.item()
            confidence_score = confidence.item()
            
            # Map to body part
            body_part = self.class_mapping.get(predicted_idx, BodyPart.UNKNOWN)
            
            return {
                "body_part": body_part.value,
                "confidence": confidence_score,
                "probabilities": {
                    BodyPart.HAND.value: probabilities[0][0].item(),
                    BodyPart.LEG.value: probabilities[0][1].item(),
                    BodyPart.UNKNOWN.value: probabilities[0][2].item()
                }
            }
            
        except Exception as e:
            logger.error(f"Output postprocessing failed: {e}")
            raise ValueError(f"Failed to postprocess model output: {e}")
    
    async def classify_body_part(self, image_data: bytes) -> Dict[str, Any]:
        """
        Classify body part from image data.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dict with body_part, confidence, and additional metadata
        """
        start_time = time.time()
        
        try:
            # Ensure model is loaded
            if not self.is_loaded:
                await self.load_model()
            
            # Preprocess image
            input_tensor = self._preprocess_image(image_data)
            
            # Run inference
            with torch.no_grad():
                model_output = self.model(input_tensor)
            
            # Postprocess output
            result = self._postprocess_output(model_output)
            
            # Add timing information
            inference_time = (time.time() - start_time) * 1000  # Convert to ms
            result["inference_time_ms"] = round(inference_time, 2)
            
            # Check if confidence meets threshold
            try:
                from app.config import config
                threshold = config.router_threshold
            except:
                threshold = 0.70  # Default threshold for testing
            if result["confidence"] < threshold:
                logger.info(f"Low confidence routing: {result['confidence']:.3f} < {threshold}")
                result["needs_guided_input"] = True
            else:
                result["needs_guided_input"] = False
            
            logger.info(f"Router classification: {result['body_part']} (confidence: {result['confidence']:.3f}, time: {inference_time:.1f}ms)")
            
            return result
            
        except Exception as e:
            logger.error(f"Router classification failed: {e}")
            # Return unknown with low confidence on error
            return {
                "body_part": BodyPart.UNKNOWN.value,
                "confidence": 0.0,
                "error": str(e),
                "needs_guided_input": True,
                "inference_time_ms": (time.time() - start_time) * 1000
            }
    
    async def route_image(self, image_id: str) -> Dict[str, Any]:
        """
        Route image based on classification result.
        
        Args:
            image_id: File ID of the image to classify
            
        Returns:
            Routing decision with body part and confidence
        """
        try:
            # In a real implementation, this would fetch the image from storage
            # For now, we'll simulate with a mock image
            mock_image_data = self._create_mock_image_data()
            
            # Classify the image
            classification_result = await self.classify_body_part(mock_image_data)
            
            # Create routing response
            routing_result = {
                "image_id": image_id,
                "body_part": classification_result["body_part"],
                "confidence": classification_result["confidence"],
                "inference_time_ms": classification_result["inference_time_ms"],
                "needs_guided_input": classification_result.get("needs_guided_input", False)
            }
            
            # Add routing decision
            body_part = BodyPart(classification_result["body_part"])
            confidence = classification_result["confidence"]
            try:
                from app.config import config
                threshold = config.router_threshold
            except:
                threshold = 0.70  # Default threshold for testing
            
            if confidence >= threshold:
                if body_part == BodyPart.HAND:
                    routing_result["next_steps"] = ["detect_hand"]
                elif body_part == BodyPart.LEG:
                    routing_result["next_steps"] = ["detect_leg"]
                else:
                    routing_result["next_steps"] = ["detect_hand", "detect_leg"]
            else:
                # Low confidence - run both detectors in auto mode or prompt in guided mode
                routing_result["next_steps"] = ["detect_hand", "detect_leg"]
                routing_result["reason"] = f"Low confidence ({confidence:.3f} < {threshold})"
            
            return routing_result
            
        except Exception as e:
            logger.error(f"Image routing failed: {e}")
            return {
                "image_id": image_id,
                "body_part": BodyPart.UNKNOWN.value,
                "confidence": 0.0,
                "error": str(e),
                "next_steps": ["detect_hand", "detect_leg"],
                "needs_guided_input": True
            }
    
    def _create_mock_image_data(self) -> bytes:
        """Create mock image data for testing."""
        # Create a simple RGB image
        image = Image.new('RGB', (224, 224), color='white')
        
        # Convert to bytes
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='JPEG')
        return img_buffer.getvalue()
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        return {
            "model_path": str(self.model_path),
            "is_loaded": self.is_loaded,
            "device": str(self.device),
            "model_exists": self.model_path.exists() if self.model_path else False,
            "class_mapping": {str(k): v.value for k, v in self.class_mapping.items()},
            "threshold": getattr(self, '_threshold', 0.70)
        }


# Global router agent instance - lazy initialization
_router_agent = None

def get_router_agent():
    """Get the global router agent instance."""
    global _router_agent
    if _router_agent is None:
        _router_agent = RouterAgent()
    return _router_agent

# For backward compatibility
router_agent = get_router_agent()