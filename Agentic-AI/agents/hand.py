"""Hand Agent for YOLO-based fracture detection in hand X-rays."""

import asyncio
import time
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import numpy as np
from loguru import logger

from schemas.base import BodyPart

# Import required dependencies for YOLO model
try:
    import torch
    from ultralytics import YOLO
    TORCH_AVAILABLE = True
except ImportError as e:
    TORCH_AVAILABLE = False
    torch = None
    YOLO = None
    raise ImportError(f"Required dependencies not available: {e}. Please install: pip install torch ultralytics")


class Detection:
    """Single detection result."""
    
    def __init__(self, label: str, bbox: Tuple[int, int, int, int], score: float):
        self.label = label
        self.bbox = bbox  # (x, y, w, h)
        self.score = score
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        return {
            "label": self.label,
            "bbox": list(self.bbox),
            "score": round(self.score, 3)
        }
    
    def get_xyxy(self) -> Tuple[int, int, int, int]:
        """Get bounding box in (x1, y1, x2, y2) format."""
        x, y, w, h = self.bbox
        return (x, y, x + w, y + h)


class HandAgent:
    """YOLO-based hand fracture detection agent."""
    
    def __init__(self, model_path: Optional[Path] = None):
        """Initialize hand agent with YOLO model."""
        if model_path is None:
            try:
                from app.config import config
                self.model_path = config.hand_model_path
            except:
                # Fallback for testing
                self.model_path = Path("models/hand_yolo.pt")
        else:
            self.model_path = model_path
        
        self.model = None
        self.is_loaded = False
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Hand-specific fracture labels
        self.class_names = [
            "fracture",
            "displaced_fracture", 
            "hairline_fracture",
            "comminuted_fracture",
            "avulsion_fracture"
        ]
        
        # Detection thresholds
        try:
            from app.config import config
            self.score_threshold = config.detector_score_min
            self.nms_iou = config.nms_iou
        except:
            self.score_threshold = 0.35
            self.nms_iou = 0.50
        
        logger.info(f"HandAgent initialized with model path: {self.model_path}")
    
    async def load_model(self) -> None:
        """Load the YOLO model asynchronously."""
        if self.is_loaded:
            return
        
        try:
            if not TORCH_AVAILABLE:
                raise RuntimeError("PyTorch/Ultralytics not available. Please install: pip install torch ultralytics")
            
            if not self.model_path.exists():
                raise FileNotFoundError(f"Hand YOLO model not found at {self.model_path}")
            
            # Load actual YOLO model using Ultralytics
            from ultralytics import YOLO
            self.model = YOLO(str(self.model_path))
            self.model.to(self.device)
            logger.info(f"Loaded hand YOLO model from {self.model_path} on {self.device}")
            
            # Warmup the model with a dummy input
            await self._warmup_model()
            self.is_loaded = True
            
        except Exception as e:
            logger.error(f"Failed to load hand YOLO model: {e}")
            raise RuntimeError(f"Hand YOLO model loading failed: {e}. Ensure model file exists and PyTorch is installed.")
    

    
    async def _warmup_model(self) -> None:
        """Warmup model with dummy input to optimize inference speed."""
        try:
            # Create a dummy image for warmup
            import numpy as np
            dummy_image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
            
            # Run a warmup inference
            _ = self.model.predict(dummy_image, verbose=False, save=False)
            logger.debug("Hand YOLO model warmed up successfully")
        except Exception as e:
            logger.warning(f"Hand model warmup failed: {e}")
    
    def _preprocess_image(self, image_data: bytes) -> Tuple[np.ndarray, Tuple[int, int]]:
        """Preprocess image data for YOLO input."""
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Store original size for coordinate conversion
            original_size = image.size  # (width, height)
            
            # Convert PIL image to numpy array for YOLO
            image_array = np.array(image)
            
            return image_array, original_size
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            raise ValueError(f"Failed to preprocess image: {e}")
    
    def _postprocess_detections(self, model_results, original_size: Tuple[int, int]) -> List[Detection]:
        """Postprocess YOLO model results to get filtered detections."""
        try:
            detections = []
            
            if not model_results or len(model_results) == 0:
                logger.debug("No model results to process")
                return detections
            
            # Get the first result (YOLO returns a list of results)
            result = model_results[0]
            
            # Check if there are any detections
            if result.boxes is None or len(result.boxes) == 0:
                logger.debug("No detections found in model output")
                return detections
            
            # Extract detection data
            boxes = result.boxes
            
            # Process each detection
            for i in range(len(boxes)):
                # Get confidence score
                confidence = float(boxes.conf[i])
                
                # Filter by confidence threshold
                if confidence < self.score_threshold:
                    continue
                
                # Get class ID and label
                class_id = int(boxes.cls[i])
                
                # Map class ID to fracture type label
                if class_id < len(self.class_names):
                    label = self.class_names[class_id]
                else:
                    # If class ID is not in our predefined list, use model's class names
                    label = result.names.get(class_id, f"detection_{class_id}")
                
                # Normalize to generic 'fracture' for external outputs
                if "fracture" in label:
                    normalized_label = "fracture"
                else:
                    normalized_label = label
                
                # Get bounding box coordinates (xyxy format)
                x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                
                # Convert to (x, y, width, height) format
                bbox = (int(x1), int(y1), int(x2 - x1), int(y2 - y1))
                
                # Create detection object
                detection = Detection(
                    label=normalized_label,
                    bbox=bbox,
                    score=confidence
                )
                detections.append(detection)
                
                logger.debug(f"Detected {normalized_label} (raw:{label}) with confidence {confidence:.3f} at {bbox}")
            
            # Sort by confidence (highest first)
            detections.sort(key=lambda d: d.score, reverse=True)
            
            logger.info(f"Postprocessed {len(detections)} hand detections from model output")
            return detections
            
        except Exception as e:
            logger.error(f"Detection postprocessing failed: {e}")
            return []
    
    def _create_annotated_image(self, image_data: bytes, detections: List[Detection]) -> bytes:
        """Create annotated image with detection overlays."""
        try:
            # Load original image
            image = Image.open(io.BytesIO(image_data))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Create drawing context
            draw = ImageDraw.Draw(image)
            
            # Try to load a font, fall back to default if not available
            try:
                font = ImageFont.truetype("arial.ttf", 16)
            except:
                font = ImageFont.load_default()
            
            # Color mapping for different fracture types
            colors = {
                "fracture": "#FF0000",           # Red
                "displaced_fracture": "#FF4500", # Orange Red
                "hairline_fracture": "#FFD700",  # Gold
                "comminuted_fracture": "#FF1493", # Deep Pink
                "avulsion_fracture": "#8A2BE2"   # Blue Violet
            }
            
            # Draw detections
            logger.info(f"Creating annotated image with {len(detections)} detections")
            for i, detection in enumerate(detections):
                x, y, w, h = detection.bbox
                x1, y1, x2, y2 = x, y, x + w, y + h
                
                logger.info(f"Detection {i}: label={detection.label}, bbox=({x}, {y}, {w}, {h}), coords=({x1}, {y1}, {x2}, {y2}), score={detection.score}")
                
                # Get color for this detection type
                color = colors.get(detection.label, "#FF0000")
                
                # Draw bounding box
                draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
                logger.info(f"Drew rectangle at ({x1}, {y1}, {x2}, {y2}) with color {color}")
                
                # Draw label with confidence
                label_text = f"{detection.label}: {detection.score:.2f}"
                
                # Calculate text size and position
                bbox = draw.textbbox((0, 0), label_text, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
                
                # Position label above the box, or below if not enough space
                label_y = y1 - text_height - 5 if y1 - text_height - 5 > 0 else y2 + 5
                
                # Draw background rectangle for text
                draw.rectangle(
                    [x1, label_y, x1 + text_width + 4, label_y + text_height + 4],
                    fill=color,
                    outline=color
                )
                
                # Draw text
                draw.text((x1 + 2, label_y + 2), label_text, fill="white", font=font)
            
            # Convert back to bytes
            img_buffer = io.BytesIO()
            image.save(img_buffer, format='JPEG', quality=95)
            annotated_bytes = img_buffer.getvalue()
            
            logger.info(f"Successfully created annotated image: {len(annotated_bytes)} bytes")
            return annotated_bytes
            
        except Exception as e:
            logger.error(f"Failed to create annotated image: {e}")
            # Return original image on error
            return image_data
    
    async def detect_fractures(self, image_data: bytes) -> Dict[str, Any]:
        """
        Detect fractures in hand X-ray image.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dict with detections and metadata
        """
        start_time = time.time()
        
        try:
            # Ensure model is loaded
            if not self.is_loaded:
                await self.load_model()
            
            # Preprocess image
            image_array, original_size = self._preprocess_image(image_data)
            
            # Run inference with YOLO model
            model_results = self.model.predict(
                image_array,
                conf=self.score_threshold,  # Confidence threshold
                iou=self.nms_iou,          # IoU threshold for NMS
                verbose=False,              # Suppress verbose output
                save=False                  # Don't save results to disk
            )
            
            # Log model results for debugging
            logger.info(f"YOLO model inference completed. Results: {len(model_results)} batch(es)")
            if len(model_results) > 0:
                result = model_results[0]
                if hasattr(result, 'boxes') and result.boxes is not None:
                    num_detections = len(result.boxes)
                    logger.info(f"YOLO detected {num_detections} objects")
                    if num_detections > 0:
                        logger.info(f"Detection details: boxes shape={result.boxes.xyxy.shape}, confidence scores={result.boxes.conf.tolist()}")
                else:
                    logger.info("YOLO model returned no boxes")
            
            # Postprocess detections
            detections = self._postprocess_detections(model_results, original_size)
            logger.info(f"After postprocessing: {len(detections)} valid detections")
            for i, det in enumerate(detections):
                logger.info(f"Detection {i}: {det.label} confidence={det.score:.3f} bbox={det.bbox}")
            
            # Create annotated image
            logger.info(f"About to create annotated image with {len(detections)} detections")
            for i, det in enumerate(detections):
                logger.info(f"Input detection {i}: {det.label} confidence={det.score:.3f} bbox={det.bbox}")
            annotated_image_data = self._create_annotated_image(image_data, detections)
            
            # Convert detections to dict format for consistency
            detection_list = [det.to_dict() for det in detections]
            
            return {
                "body_part": "hand",
                "detections": detection_list,
                "annotated_image_data": annotated_image_data,
                "detection_count": len(detection_list),
                "inference_time_ms": round((time.time() - start_time) * 1000, 2),
                "model_confidence_threshold": self.score_threshold,
                "image_size": original_size
            }
            
        except Exception as e:
            logger.error(f"Hand fracture detection failed: {e}")
            return {
                "body_part": "hand",
                "detections": [],
                "annotated_image_data": image_data,  # Return original image on error
                "detection_count": 0,
                "error": str(e),
                "inference_time_ms": round((time.time() - start_time) * 1000, 2)
            }
    
    async def analyze(self, image_data: bytes) -> Dict[str, Any]:
        """
        Analyze hand X-ray image for fractures.
        Returns full analysis result including annotated image.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Full analysis result dict
        """
        try:
            result = await self.detect_fractures(image_data)
            return result
        except Exception as e:
            logger.error(f"Hand analysis failed: {e}")
            return {
                "body_part": "hand",
                "detections": [],
                "annotated_image_data": image_data,
                "detection_count": 0,
                "error": str(e)
            }
    
    async def process_image(self, image_id: str) -> Dict[str, Any]:
        """
        Process image for hand fracture detection.
        
        Args:
            image_id: File ID of the image to process
            
        Returns:
            Detection result with file IDs for storage
        """
        try:
            # Import storage service
            from services.storage import storage_service
            
            # Retrieve original image from storage
            image_data = storage_service.retrieve_file(image_id)
            if image_data is None:
                raise ValueError(f"Could not retrieve image {image_id} from storage")
            
            # Detect fractures
            detection_result = await self.detect_fractures(image_data)
            
            # Store annotated image if detection was successful
            annotated_image_id = None
            if "annotated_image_data" in detection_result:
                try:
                    annotated_image_id = storage_service.store_file(
                        detection_result["annotated_image_data"],
                        "annotated",
                        "jpg"
                    )
                    logger.debug(f"Stored annotated image: {annotated_image_id}")
                except Exception as e:
                    logger.error(f"Failed to store annotated image: {e}")
                    annotated_image_id = f"file-ann-{image_id}-{int(time.time())}"  # Fallback ID
            
            # Format response according to task specification
            response = {
                "detections": detection_result["detections"],
                "annotated_image_id": annotated_image_id,
                "inference_time_ms": detection_result["inference_time_ms"],
                "original_image_id": image_id
            }
            
            # Add error if present
            if "error" in detection_result:
                response["error"] = detection_result["error"]
            
            return response
            
        except Exception as e:
            logger.error(f"Hand image processing failed: {e}")
            return {
                "detections": [],
                "annotated_image_id": None,
                "error": str(e),
                "original_image_id": image_id,
                "inference_time_ms": 0
            }
    

    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        model_size = None
        if self.model_path and self.model_path.exists():
            model_size = self.model_path.stat().st_size
        
        return {
            "model_path": str(self.model_path),
            "is_loaded": self.is_loaded,
            "device": str(self.device),
            "model_exists": self.model_path.exists() if self.model_path else False,
            "model_size_bytes": model_size,
            "class_names": self.class_names,
            "score_threshold": self.score_threshold,
            "nms_iou": self.nms_iou,
            "torch_available": TORCH_AVAILABLE,
            "ultralytics_available": True  # Since we require it now
        }


# Global hand agent instance - lazy initialization
_hand_agent = None

def get_hand_agent():
    """Get the global hand agent instance."""
    global _hand_agent
    if _hand_agent is None:
        _hand_agent = HandAgent()
    return _hand_agent

# For backward compatibility
hand_agent = get_hand_agent()