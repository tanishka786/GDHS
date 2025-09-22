"""API endpoints for serving annotated images."""

import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Response, Depends
from fastapi.responses import StreamingResponse
from loguru import logger
import io

from services.storage import storage_service
from services.security import verify_api_key

router = APIRouter()


@router.get("/annotated/{image_id}")
async def get_annotated_image(
    image_id: str,
    api_key: Optional[str] = Depends(verify_api_key)
) -> StreamingResponse:
    """
    Retrieve an annotated image by ID.
    
    Args:
        image_id: The ID of the annotated image to retrieve
        api_key: Optional API key for authentication
        
    Returns:
        StreamingResponse with image bytes and appropriate content-type
        
    Raises:
        HTTPException: If image not found or access denied
    """
    try:
        # Validate image ID format
        if not image_id or not isinstance(image_id, str):
            raise HTTPException(status_code=400, detail="Invalid image ID")
        
        # Sanitize image ID to prevent path traversal
        sanitized_id = image_id.replace("..", "").replace("/", "").replace("\\", "")
        if sanitized_id != image_id:
            logger.warning(f"Potentially malicious image ID blocked: {image_id}")
            raise HTTPException(status_code=400, detail="Invalid image ID format")
        
        logger.info(f"Attempting to retrieve annotated image: {image_id}")
        
        # Retrieve image data from storage
        try:
            image_data = storage_service.retrieve_file(image_id)
            if image_data is None:
                logger.warning(f"Annotated image not found in storage: {image_id}")
                raise HTTPException(status_code=404, detail="Annotated image not found")
            logger.info(f"Successfully retrieved annotated image: {image_id} ({len(image_data)} bytes)")
        except FileNotFoundError:
            logger.warning(f"Annotated image file not found: {image_id}")
            raise HTTPException(status_code=404, detail="Annotated image not found")
        except Exception as e:
            logger.error(f"Failed to retrieve annotated image {image_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to retrieve image")
        
        # Determine content type based on image format
        content_type = "image/jpeg"  # Default to JPEG
        if image_id.lower().endswith('.png'):
            content_type = "image/png"
        elif image_id.lower().endswith('.jpg') or image_id.lower().endswith('.jpeg'):
            content_type = "image/jpeg"
        
        # Create streaming response
        image_stream = io.BytesIO(image_data)
        
        # Set appropriate headers
        headers = {
            "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            "Content-Disposition": f"inline; filename=\"{sanitized_id}\"",
            "X-Content-Type-Options": "nosniff"
        }
        
        logger.debug(f"Serving annotated image: {image_id} ({len(image_data)} bytes)")
        
        return StreamingResponse(
            io.BytesIO(image_data),
            media_type=content_type,
            headers=headers
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error serving annotated image {image_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/annotated/{image_id}/info")
async def get_annotated_image_info(
    image_id: str,
    api_key: Optional[str] = Depends(verify_api_key)
) -> dict:
    """
    Get metadata about an annotated image.
    
    Args:
        image_id: The ID of the annotated image
        api_key: Optional API key for authentication
        
    Returns:
        Dictionary with image metadata
        
    Raises:
        HTTPException: If image not found or access denied
    """
    try:
        # Validate and sanitize image ID
        if not image_id or not isinstance(image_id, str):
            raise HTTPException(status_code=400, detail="Invalid image ID")
        
        sanitized_id = image_id.replace("..", "").replace("/", "").replace("\\", "")
        if sanitized_id != image_id:
            raise HTTPException(status_code=400, detail="Invalid image ID format")
        
        # Check if image exists
        try:
            image_data = storage_service.retrieve_file(image_id)
            if image_data is None:
                raise HTTPException(status_code=404, detail="Annotated image not found")
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Annotated image not found")
        except Exception as e:
            logger.error(f"Failed to check annotated image {image_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to check image")
        
        # Get file metadata
        file_size = len(image_data)
        
        # Determine format
        image_format = "jpeg"
        if image_id.lower().endswith('.png'):
            image_format = "png"
        elif image_id.lower().endswith('.jpg') or image_id.lower().endswith('.jpeg'):
            image_format = "jpeg"
        
        return {
            "image_id": image_id,
            "size_bytes": file_size,
            "format": image_format,
            "content_type": f"image/{image_format}",
            "url": f"/api/annotated/{image_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting annotated image info {image_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.head("/annotated/{image_id}")
async def head_annotated_image(
    image_id: str,
    api_key: Optional[str] = Depends(verify_api_key)
) -> Response:
    """
    Check if an annotated image exists (HEAD request).
    
    Args:
        image_id: The ID of the annotated image
        api_key: Optional API key for authentication
        
    Returns:
        Response with appropriate headers
        
    Raises:
        HTTPException: If image not found or access denied
    """
    try:
        # Validate and sanitize image ID
        if not image_id or not isinstance(image_id, str):
            raise HTTPException(status_code=400, detail="Invalid image ID")
        
        sanitized_id = image_id.replace("..", "").replace("/", "").replace("\\", "")
        if sanitized_id != image_id:
            raise HTTPException(status_code=400, detail="Invalid image ID format")
        
        # Check if image exists
        try:
            image_data = storage_service.retrieve_file(image_id)
            if image_data is None:
                raise HTTPException(status_code=404, detail="Annotated image not found")
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Annotated image not found")
        except Exception as e:
            logger.error(f"Failed to check annotated image {image_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to check image")
        
        # Determine content type
        content_type = "image/jpeg"
        if image_id.lower().endswith('.png'):
            content_type = "image/png"
        elif image_id.lower().endswith('.jpg') or image_id.lower().endswith('.jpeg'):
            content_type = "image/jpeg"
        
        # Return headers without body
        headers = {
            "Content-Type": content_type,
            "Content-Length": str(len(image_data)),
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff"
        }
        
        return Response(headers=headers)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error checking annotated image {image_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")