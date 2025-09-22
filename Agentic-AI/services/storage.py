"""Storage service for managing files and artifacts using MongoDB GridFS and local filesystem."""

import os
import hashlib
from typing import Dict, Any, Optional, BinaryIO, Union
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timedelta
from loguru import logger
import io

try:
    import pymongo
    from pymongo import MongoClient
    from gridfs import GridFS
    from gridfs.errors import NoFile
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False
    pymongo = None
    MongoClient = None
    GridFS = None
    NoFile = Exception


class StorageService:
    """Service for managing file storage (local filesystem or MongoDB GridFS)."""
    
    def __init__(self):
        """Initialize storage service based on configuration."""
        try:
            from app.config import config
            self.storage_type = config.storage_type
            self.storage_path = config.storage_path
            self.mongodb_uri = getattr(config, 'mongodb_uri', None)
            self.mongodb_database = getattr(config, 'mongodb_database', 'orthopedic_assistant')
        except:
            # Fallback for testing
            self.storage_type = "local"
            self.storage_path = Path("./storage")
            self.mongodb_uri = "mongodb://localhost:27017"
            self.mongodb_database = "orthopedic_assistant"
        
        self.mongo_client = None
        self.gridfs_collections = {}
        
        if self.storage_type == "local":
            self._setup_local_storage()
        elif self.storage_type == "mongodb":
            self._setup_mongodb_storage()
        
        logger.info(f"Storage service initialized: {self.storage_type}")
    
    def _setup_local_storage(self) -> None:
        """Setup local file storage."""
        # Create storage directories
        self.raw_path = self.storage_path / "raw"
        self.annotated_path = self.storage_path / "annotated"
        self.reports_path = self.storage_path / "reports"
        self.manifests_path = self.storage_path / "manifests"
        
        for path in [self.raw_path, self.annotated_path, self.reports_path, self.manifests_path]:
            path.mkdir(parents=True, exist_ok=True)
        
        logger.debug(f"Local storage directories created at {self.storage_path}")
    
    def _setup_mongodb_storage(self) -> None:
        """Setup MongoDB GridFS storage."""
        if not PYMONGO_AVAILABLE:
            raise RuntimeError("pymongo not available for MongoDB storage")
        
        if not self.mongodb_uri:
            raise ValueError("MongoDB URI not configured")
        
        # Initialize MongoDB client
        try:
            self.mongo_client = MongoClient(self.mongodb_uri)
            self.database = self.mongo_client[self.mongodb_database]
            
            # Test connection
            self.mongo_client.admin.command('ping')
            
            # Initialize GridFS collections for different file types
            collection_names = ['raw', 'annotated', 'reports', 'manifests']
            for collection_name in collection_names:
                self.gridfs_collections[collection_name] = GridFS(
                    self.database, 
                    collection=collection_name
                )
            
            logger.debug(f"MongoDB GridFS collections initialized: {collection_names}")
            
        except Exception as e:
            logger.error(f"Cannot connect to MongoDB: {e}")
            raise
    
    def store_file(self, file_data: bytes, file_type: str, file_extension: str = "jpg") -> str:
        """
        Store file and return file ID.
        
        Args:
            file_data: Binary file data
            file_type: Type of file (raw, annotated, report, manifest)
            file_extension: File extension without dot
            
        Returns:
            File ID for retrieval
        """
        try:
            # Generate unique file ID
            file_id = f"file-{file_type}-{uuid4().hex[:12]}-{int(datetime.utcnow().timestamp())}"
            filename = f"{file_id}.{file_extension}"
            
            if self.storage_type == "local":
                return self._store_local_file(file_data, file_type, filename, file_id)
            elif self.storage_type == "mongodb":
                return self._store_mongodb_file(file_data, file_type, filename, file_id)
            else:
                raise ValueError(f"Unsupported storage type: {self.storage_type}")
                
        except Exception as e:
            logger.error(f"Failed to store {file_type} file: {e}")
            raise
    
    def _store_local_file(self, file_data: bytes, file_type: str, filename: str, file_id: str) -> str:
        """Store file locally."""
        # Determine storage path based on file type
        if file_type == "raw":
            storage_dir = self.raw_path
        elif file_type == "annotated":
            storage_dir = self.annotated_path
        elif file_type == "report":
            storage_dir = self.reports_path
        elif file_type == "manifest":
            storage_dir = self.manifests_path
        else:
            raise ValueError(f"Unknown file type: {file_type}")
        
        file_path = storage_dir / filename
        
        # Write file
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        # Calculate file hash for integrity
        file_hash = hashlib.sha256(file_data).hexdigest()
        
        logger.debug(f"Stored {file_type} file: {filename} (hash: {file_hash[:8]})")
        return file_id
    
    def _store_mongodb_file(self, file_data: bytes, file_type: str, filename: str, file_id: str) -> str:
        """Store file in MongoDB GridFS."""
        if file_type not in self.gridfs_collections:
            raise ValueError(f"Unknown file type: {file_type}")
        
        gridfs = self.gridfs_collections[file_type]
        
        # Calculate file hash for integrity
        file_hash = hashlib.sha256(file_data).hexdigest()
        
        # Store file with metadata
        file_stream = io.BytesIO(file_data)
        gridfs_id = gridfs.put(
            file_stream,
            filename=filename,
            file_id=file_id,
            content_type=self._get_content_type(filename),
            upload_date=datetime.utcnow(),
            sha256=file_hash,
            size=len(file_data)
        )
        
        logger.debug(f"Stored {file_type} file to MongoDB GridFS: {filename} (hash: {file_hash[:8]})")
        return file_id
    
    def retrieve_file(self, file_id: str) -> Optional[bytes]:
        """
        Retrieve file by ID.
        
        Args:
            file_id: File ID returned by store_file
            
        Returns:
            File data or None if not found
        """
        try:
            if self.storage_type == "local":
                return self._retrieve_local_file(file_id)
            elif self.storage_type == "mongodb":
                return self._retrieve_mongodb_file(file_id)
            else:
                raise ValueError(f"Unsupported storage type: {self.storage_type}")
                
        except Exception as e:
            logger.error(f"Failed to retrieve file {file_id}: {e}")
            return None
    
    def _retrieve_local_file(self, file_id: str) -> Optional[bytes]:
        """Retrieve file from local storage."""
        # Search in all storage directories
        for storage_dir in [self.raw_path, self.annotated_path, self.reports_path, self.manifests_path]:
            for file_path in storage_dir.glob(f"{file_id}.*"):
                try:
                    with open(file_path, 'rb') as f:
                        return f.read()
                except Exception as e:
                    logger.warning(f"Failed to read {file_path}: {e}")
                    continue
        
        logger.warning(f"File not found in local storage: {file_id}")
        return None
    
    def _retrieve_mongodb_file(self, file_id: str) -> Optional[bytes]:
        """Retrieve file from MongoDB GridFS."""
        # Search in all collections
        for file_type, gridfs in self.gridfs_collections.items():
            try:
                # Find file by file_id
                grid_out = gridfs.find_one({"file_id": file_id})
                if grid_out:
                    return grid_out.read()
            except NoFile:
                continue
            except Exception as e:
                logger.warning(f"MongoDB error retrieving {file_id} from {file_type}: {e}")
                continue
        
        logger.warning(f"File not found in MongoDB GridFS: {file_id}")
        return None
    
    def get_file_url(self, file_id: str, expires_in: int = 3600) -> Optional[str]:
        """
        Get signed URL for file access.
        
        Args:
            file_id: File ID
            expires_in: URL expiration time in seconds
            
        Returns:
            Signed URL or None if not supported/found
        """
        if self.storage_type == "mongodb":
            return self._get_mongodb_signed_url(file_id, expires_in)
        else:
            # Local storage doesn't support signed URLs
            return None
    
    def _get_mongodb_signed_url(self, file_id: str, expires_in: int) -> Optional[str]:
        """Generate signed URL for MongoDB GridFS file."""
        try:
            # Find the file first
            for file_type, gridfs in self.gridfs_collections.items():
                try:
                    grid_out = gridfs.find_one({"file_id": file_id})
                    if grid_out:
                        # Create a signed URL token (simplified implementation)
                        # In production, this should use proper JWT or similar
                        import base64
                        import json
                        
                        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                        token_data = {
                            "file_id": file_id,
                            "file_type": file_type,
                            "expires_at": expires_at.isoformat()
                        }
                        
                        # Simple base64 encoding (in production, use proper signing)
                        token = base64.b64encode(json.dumps(token_data).encode()).decode()
                        
                        # Return URL with token (this would be handled by your web server)
                        return f"/api/files/{file_id}?token={token}"
                        
                except NoFile:
                    continue
                except Exception as e:
                    logger.warning(f"Error generating signed URL for {file_id}: {e}")
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to generate signed URL for {file_id}: {e}")
            return None
    
    def delete_file(self, file_id: str) -> bool:
        """
        Delete file by ID.
        
        Args:
            file_id: File ID to delete
            
        Returns:
            True if deleted successfully
        """
        try:
            if self.storage_type == "local":
                return self._delete_local_file(file_id)
            elif self.storage_type == "mongodb":
                return self._delete_mongodb_file(file_id)
            else:
                raise ValueError(f"Unsupported storage type: {self.storage_type}")
                
        except Exception as e:
            logger.error(f"Failed to delete file {file_id}: {e}")
            return False
    
    def _delete_local_file(self, file_id: str) -> bool:
        """Delete file from local storage."""
        deleted = False
        for storage_dir in [self.raw_path, self.annotated_path, self.reports_path, self.manifests_path]:
            for file_path in storage_dir.glob(f"{file_id}.*"):
                try:
                    file_path.unlink()
                    deleted = True
                    logger.debug(f"Deleted local file: {file_path}")
                except Exception as e:
                    logger.warning(f"Failed to delete {file_path}: {e}")
        
        return deleted
    
    def _delete_mongodb_file(self, file_id: str) -> bool:
        """Delete file from MongoDB GridFS."""
        deleted = False
        for file_type, gridfs in self.gridfs_collections.items():
            try:
                # Find and delete all files with this file_id
                for grid_out in gridfs.find({"file_id": file_id}):
                    gridfs.delete(grid_out._id)
                    deleted = True
                    logger.debug(f"Deleted MongoDB GridFS file: {file_id} from {file_type}")
                        
            except Exception as e:
                logger.warning(f"Failed to delete MongoDB files for {file_id}: {e}")
        
        return deleted
    
    def _get_content_type(self, filename: str) -> str:
        """Get content type based on file extension."""
        extension = Path(filename).suffix.lower()
        content_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.pdf': 'application/pdf',
            '.json': 'application/json',
            '.txt': 'text/plain'
        }
        return content_types.get(extension, 'application/octet-stream')
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get storage service information."""
        info = {
            "storage_type": self.storage_type,
            "storage_path": str(self.storage_path) if self.storage_path else None,
            "mongodb_uri": self.mongodb_uri if hasattr(self, 'mongodb_uri') else None,
            "mongodb_database": self.mongodb_database if hasattr(self, 'mongodb_database') else None,
            "pymongo_available": PYMONGO_AVAILABLE
        }
        
        if self.storage_type == "local":
            # Add local storage stats
            try:
                total_files = 0
                for storage_dir in [self.raw_path, self.annotated_path, self.reports_path, self.manifests_path]:
                    if storage_dir.exists():
                        total_files += len(list(storage_dir.glob("*")))
                info["total_files"] = total_files
            except Exception:
                info["total_files"] = "unknown"
        
        elif self.storage_type == "mongodb":
            # Add MongoDB storage stats
            try:
                total_files = 0
                collection_stats = {}
                for file_type, gridfs in self.gridfs_collections.items():
                    count = gridfs._GridFS__files.count_documents({})
                    collection_stats[file_type] = count
                    total_files += count
                
                info["total_files"] = total_files
                info["collection_stats"] = collection_stats
            except Exception:
                info["total_files"] = "unknown"
                info["collection_stats"] = "unknown"
        
        return info


# Global storage service instance
storage_service = StorageService()