"""Image validation utilities for medical image processing."""

import io
from typing import Tuple, Optional, Dict, Any
from PIL import Image, ImageStat
import logging

from .exceptions import ImageValidationError
from services.error_handler import ErrorCode

logger = logging.getLogger(__name__)


class ImageValidator:
    """Validates medical images for quality and format requirements."""
    
    # Configuration constants
    SUPPORTED_FORMATS = {"JPEG", "PNG"}
    MIN_RESOLUTION = (512, 512)  # Minimum width x height
    MAX_FILE_SIZE_MB = 50  # Maximum file size in MB
    MIN_FILE_SIZE_BYTES = 1024  # Minimum 1KB to avoid empty files
    
    # Feature flags
    DICOM_ENABLED = False  # DICOM support behind feature flag
    
    def __init__(self, 
                 min_resolution: Optional[Tuple[int, int]] = None,
                 max_file_size_mb: Optional[int] = None,
                 dicom_enabled: bool = False):
        """Initialize image validator with optional custom settings.
        
        Args:
            min_resolution: Minimum (width, height) resolution
            max_file_size_mb: Maximum file size in MB
            dicom_enabled: Enable DICOM format support
        """
        self.min_resolution = min_resolution or self.MIN_RESOLUTION
        self.max_file_size_mb = max_file_size_mb or self.MAX_FILE_SIZE_MB
        self.dicom_enabled = dicom_enabled
        
        # Update supported formats if DICOM is enabled
        self.supported_formats = self.SUPPORTED_FORMATS.copy()
        if self.dicom_enabled:
            self.supported_formats.add("DICOM")
    
    def validate_image(self, image_data: bytes, filename: Optional[str] = None) -> Dict[str, Any]:
        """Validate image data for medical processing requirements.
        
        Args:
            image_data: Raw image bytes
            filename: Optional filename for better error messages
            
        Returns:
            Dict containing validation results and normalized image info
            
        Raises:
            ImageValidationError: If validation fails
        """
        try:
            # Basic file size validation
            self._validate_file_size(image_data, filename)
            
            # Load and validate image format
            image = self._load_and_validate_format(image_data, filename)
            
            # Validate image properties
            self._validate_resolution(image, filename)
            self._validate_image_content(image, filename)
            
            # Return validation results with normalized info
            return {
                "valid": True,
                "format": image.format,
                "size": image.size,
                "mode": image.mode,
                "file_size_bytes": len(image_data),
                "normalized_info": self._get_normalized_info(image)
            }
            
        except ImageValidationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error validating image {filename}: {e}")
            raise ImageValidationError(
                f"Failed to validate image: {str(e)}",
                "IMAGE_PROCESSING_ERROR"
            )
    
    def _validate_file_size(self, image_data: bytes, filename: Optional[str] = None) -> None:
        """Validate file size constraints."""
        file_size = len(image_data)
        
        if file_size < self.MIN_FILE_SIZE_BYTES:
            raise ImageValidationError(
                f"Image file too small ({file_size} bytes). Minimum size is {self.MIN_FILE_SIZE_BYTES} bytes.",
                ErrorCode.IMAGE_TOO_SMALL
            )
        
        max_size_bytes = self.max_file_size_mb * 1024 * 1024
        if file_size > max_size_bytes:
            raise ImageValidationError(
                f"Image file too large ({file_size / (1024*1024):.1f}MB). Maximum size is {self.max_file_size_mb}MB.",
                ErrorCode.IMAGE_TOO_LARGE
            )
    
    def _load_and_validate_format(self, image_data: bytes, filename: Optional[str] = None) -> Image.Image:
        """Load image and validate format."""
        try:
            image = Image.open(io.BytesIO(image_data))
            
            # Validate format
            if image.format not in self.supported_formats:
                supported_list = ", ".join(sorted(self.supported_formats))
                raise ImageValidationError(
                    f"Unsupported image format '{image.format}'. Supported formats: {supported_list}",
                    ErrorCode.UNSUPPORTED_FORMAT
                )
            
            return image
            
        except Exception as e:
            if isinstance(e, ImageValidationError):
                raise
            raise ImageValidationError(
                f"Cannot open image file: {str(e)}",
                "INVALID_IMAGE_DATA"
            )
    
    def _validate_resolution(self, image: Image.Image, filename: Optional[str] = None) -> None:
        """Validate image resolution requirements."""
        width, height = image.size
        min_width, min_height = self.min_resolution
        
        if width < min_width or height < min_height:
            raise ImageValidationError(
                f"Image resolution too low ({width}x{height}). "
                f"Minimum resolution required: {min_width}x{min_height}",
                ErrorCode.RESOLUTION_TOO_LOW
            )
    
    def _validate_image_content(self, image: Image.Image, filename: Optional[str] = None) -> None:
        """Validate that image is not blank or corrupted."""
        try:
            # Convert to RGB if needed for analysis
            if image.mode not in ('RGB', 'L'):
                analysis_image = image.convert('RGB')
            else:
                analysis_image = image
            
            # Check if image is blank (all pixels same color or very low variance)
            stat = ImageStat.Stat(analysis_image)
            
            # For grayscale, check single channel variance
            if analysis_image.mode == 'L':
                variance = stat.var[0]
                if variance < 1:  # Very low variance indicates blank image
                    raise ImageValidationError(
                        "Image appears to be blank or has insufficient content variation",
                        ErrorCode.BLANK_IMAGE
                    )
            else:
                # For RGB, check if any channel has reasonable variance
                max_variance = max(stat.var)
                if max_variance < 1:
                    raise ImageValidationError(
                        "Image appears to be blank or has insufficient content variation",
                        ErrorCode.BLANK_IMAGE
                    )
            
        except Exception as e:
            if isinstance(e, ImageValidationError):
                raise
            logger.warning(f"Could not analyze image content: {e}")
            # Don't fail validation for content analysis issues
    
    def _get_normalized_info(self, image: Image.Image) -> Dict[str, Any]:
        """Get normalized image information for processing pipeline."""
        return {
            "original_size": image.size,
            "aspect_ratio": image.size[0] / image.size[1],
            "pixel_count": image.size[0] * image.size[1],
            "color_mode": image.mode,
            "has_transparency": image.mode in ('RGBA', 'LA') or 'transparency' in image.info
        }
    
    def normalize_image(self, image_data: bytes) -> Tuple[bytes, Dict[str, Any]]:
        """Normalize image for processing pipeline.
        
        Args:
            image_data: Raw image bytes (must be pre-validated)
            
        Returns:
            Tuple of (normalized_image_bytes, normalization_info)
        """
        try:
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed (removes alpha channel, standardizes format)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save normalized image
            output_buffer = io.BytesIO()
            image.save(output_buffer, format='JPEG', quality=95, optimize=True)
            normalized_bytes = output_buffer.getvalue()
            
            normalization_info = {
                "original_mode": Image.open(io.BytesIO(image_data)).mode,
                "normalized_mode": "RGB",
                "normalized_format": "JPEG",
                "size_reduction": len(image_data) - len(normalized_bytes)
            }
            
            return normalized_bytes, normalization_info
            
        except Exception as e:
            raise ImageValidationError(
                f"Failed to normalize image: {str(e)}",
                "NORMALIZATION_ERROR"
            )