"""Cloudinary integration service for image uploads."""

import os
import base64
import cloudinary
import cloudinary.uploader
from typing import Optional, Dict, Any
from loguru import logger
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class CloudinaryService:
    """Service for uploading images to Cloudinary."""
    
    def __init__(self):
        """Initialize Cloudinary with configuration from environment."""
        self.cloudinary_url = os.getenv('CLOUDINARY_URL')
        if self.cloudinary_url:
            # Parse the cloudinary URL format: cloudinary://api_key:api_secret@cloud_name
            try:
                from urllib.parse import urlparse
                parsed = urlparse(self.cloudinary_url)
                
                # Extract components
                api_key = parsed.username
                api_secret = parsed.password
                cloud_name = parsed.hostname
                
                # Configure cloudinary with explicit values
                cloudinary.config(
                    cloud_name=cloud_name,
                    api_key=api_key,
                    api_secret=api_secret,
                    secure=True
                )
                
                logger.info(f"Cloudinary configured successfully for cloud: {cloud_name}")
            except Exception as e:
                logger.error(f"Failed to parse CLOUDINARY_URL: {e}")
                self.cloudinary_url = None
        else:
            logger.warning("CLOUDINARY_URL not found in environment variables")
    
    def upload_original_image(self, image_data: bytes, filename: str, request_id: str) -> Optional[Dict[str, Any]]:
        """
        Upload original image to Cloudinary in OrthoImage/original/ folder.
        
        Args:
            image_data: Raw image bytes
            filename: Original filename
            request_id: Unique request identifier
            
        Returns:
            Dict with upload result including URL, or None if failed
        """
        try:
            if not self.cloudinary_url:
                logger.error("Cloudinary not configured")
                return None
            
            # Generate unique filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_ext = filename.split('.')[-1] if '.' in filename else 'jpg'
            unique_filename = f"{request_id}_{timestamp}_original.{file_ext}"
            
            # Upload to OrthoImage/original/ folder
            result = cloudinary.uploader.upload(
                image_data,
                folder="OrthoImage/original",
                public_id=unique_filename.replace(f'.{file_ext}', ''),
                resource_type="image",
                overwrite=True,
                tags=["orthopedic", "original", "x-ray"]
            )
            
            logger.info(f"Original image uploaded to Cloudinary: {result.get('secure_url')}")
            return {
                "url": result.get("secure_url"),
                "public_id": result.get("public_id"),
                "version": result.get("version"),
                "format": result.get("format"),
                "width": result.get("width"),
                "height": result.get("height"),
                "bytes": result.get("bytes")
            }
            
        except Exception as e:
            logger.error(f"Failed to upload original image to Cloudinary: {e}")
            return None
    
    def upload_annotated_image(self, image_data: bytes, filename: str, request_id: str) -> Optional[Dict[str, Any]]:
        """
        Upload annotated image to Cloudinary in OrthoImage/annotated/ folder.
        
        Args:
            image_data: Raw annotated image bytes
            filename: Original filename (for reference)
            request_id: Unique request identifier
            
        Returns:
            Dict with upload result including URL, or None if failed
        """
        try:
            if not self.cloudinary_url:
                logger.error("Cloudinary not configured")
                return None
            
            # Generate unique filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_ext = filename.split('.')[-1] if '.' in filename else 'jpg'
            unique_filename = f"{request_id}_{timestamp}_annotated.{file_ext}"
            
            # Upload to OrthoImage/annotated/ folder
            result = cloudinary.uploader.upload(
                image_data,
                folder="OrthoImage/annotated",
                public_id=unique_filename.replace(f'.{file_ext}', ''),
                resource_type="image",
                overwrite=True,
                tags=["orthopedic", "annotated", "x-ray", "ai-analysis"]
            )
            
            logger.info(f"Annotated image uploaded to Cloudinary: {result.get('secure_url')}")
            return {
                "url": result.get("secure_url"),
                "public_id": result.get("public_id"),
                "version": result.get("version"),
                "format": result.get("format"),
                "width": result.get("width"),
                "height": result.get("height"),
                "bytes": result.get("bytes")
            }
            
        except Exception as e:
            logger.error(f"Failed to upload annotated image to Cloudinary: {e}")
            return None
    
    async def upload_analysis_images(self, original_image: bytes, annotated_image: bytes, request_id: str = None) -> Dict[str, str]:
        """
        Upload both original and annotated images for analysis.
        
        Args:
            original_image: Original image bytes
            annotated_image: Annotated image bytes
            request_id: Optional request ID
            
        Returns:
            Dict with URLs for both images
        """
        try:
            if not request_id:
                import uuid
                request_id = str(uuid.uuid4())
            
            # Upload original image
            original_result = self.upload_original_image(
                image_data=original_image,
                filename="xray_original.jpg",
                request_id=request_id
            )
            
            # Upload annotated image
            annotated_result = self.upload_annotated_image(
                image_data=annotated_image,
                filename="xray_annotated.jpg", 
                request_id=request_id
            )
            
            return {
                "original_image_url": original_result.get("url") if original_result else None,
                "annotated_image_url": annotated_result.get("url") if annotated_result else None,
                "request_id": request_id
            }
            
        except Exception as e:
            logger.error(f"Failed to upload analysis images: {e}")
            return {
                "original_image_url": None,
                "annotated_image_url": None,
                "error": str(e)
            }
    
    def upload_base64_image(self, base64_data: str, is_annotated: bool, filename: str, request_id: str) -> Optional[Dict[str, Any]]:
        """
        Upload base64 encoded image to appropriate Cloudinary folder.
        
        Args:
            base64_data: Base64 encoded image data
            is_annotated: True for annotated folder, False for original
            filename: Original filename
            request_id: Unique request identifier
            
        Returns:
            Dict with upload result including URL, or None if failed
        """
        try:
            # Clean base64 data if it has data URL prefix
            if base64_data.startswith('data:'):
                base64_data = base64_data.split(',')[1]
            
            # Convert base64 to bytes
            image_bytes = base64.b64decode(base64_data)
            
            if is_annotated:
                return self.upload_annotated_image(image_bytes, filename, request_id)
            else:
                return self.upload_original_image(image_bytes, filename, request_id)
                
        except Exception as e:
            logger.error(f"Failed to process base64 image: {e}")
            return None
    
    def delete_image(self, public_id: str) -> bool:
        """
        Delete image from Cloudinary.
        
        Args:
            public_id: Cloudinary public ID of the image
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.cloudinary_url:
                logger.error("Cloudinary not configured")
                return False
            
            result = cloudinary.uploader.destroy(public_id)
            
            if result.get("result") == "ok":
                logger.info(f"Image deleted from Cloudinary: {public_id}")
                return True
            else:
                logger.warning(f"Failed to delete image from Cloudinary: {result}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting image from Cloudinary: {e}")
            return False


# Global instance
cloudinary_service = CloudinaryService()