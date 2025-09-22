"""Model Registry service for managing versioned AI models."""

import hashlib
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path
from loguru import logger


class ModelRegistry:
    """Service for managing versioned AI models with SHA256 records and hot-swap capabilities."""
    
    def __init__(self, registry_path: str = "./models"):
        """Initialize model registry.
        
        Args:
            registry_path: Base path for model storage
        """
        self.registry_path = Path(registry_path)
        self.registry_path.mkdir(parents=True, exist_ok=True)
        
        # Create versioned paths for different model types
        self.router_path = self.registry_path / "router"
        self.hand_path = self.registry_path / "hand" 
        self.leg_path = self.registry_path / "leg"
        
        for path in [self.router_path, self.hand_path, self.leg_path]:
            path.mkdir(parents=True, exist_ok=True)
        
        # Registry metadata file
        self.registry_file = self.registry_path / "registry.json"
        self.registry_data = self._load_registry()
        
        logger.info(f"Model registry initialized at {self.registry_path}")
    
    def _load_registry(self) -> Dict[str, Any]:
        """Load registry metadata from file."""
        if self.registry_file.exists():
            try:
                with open(self.registry_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load registry file: {e}")
        
        # Initialize empty registry
        return {
            "models": {},
            "active_versions": {},
            "audit_trail": []
        }
    
    def _save_registry(self) -> None:
        """Save registry metadata to file."""
        try:
            with open(self.registry_file, 'w') as f:
                json.dump(self.registry_data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save registry file: {e}")
            raise
    
    def _calculate_sha256(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    def register_model(self, model_type: str, version: str, model_data: bytes, 
                      metadata: Optional[Dict[str, Any]] = None) -> str:
        """Register a new model version.
        
        Args:
            model_type: Type of model (router, hand, leg)
            version: Version identifier
            model_data: Binary model data
            metadata: Optional metadata about the model
            
        Returns:
            SHA256 hash of the model
        """
        if model_type not in ["router", "hand", "leg"]:
            raise ValueError(f"Invalid model type: {model_type}")
        
        # Get model storage path
        model_dir = getattr(self, f"{model_type}_path")
        version_dir = model_dir / version
        version_dir.mkdir(parents=True, exist_ok=True)
        
        # Save model file
        model_file = version_dir / "model.bin"
        with open(model_file, 'wb') as f:
            f.write(model_data)
        
        # Calculate SHA256
        sha256_hash = self._calculate_sha256(model_file)
        
        # Save metadata
        model_metadata = {
            "version": version,
            "sha256": sha256_hash,
            "size": len(model_data),
            "registered_at": datetime.utcnow().isoformat(),
            "file_path": str(model_file),
            "metadata": metadata or {}
        }
        
        metadata_file = version_dir / "metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(model_metadata, f, indent=2, default=str)
        
        # Update registry
        model_key = f"{model_type}:{version}"
        self.registry_data["models"][model_key] = model_metadata
        
        # Add to audit trail
        self.registry_data["audit_trail"].append({
            "action": "register",
            "model_type": model_type,
            "version": version,
            "sha256": sha256_hash,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        self._save_registry()
        
        logger.info(f"Registered {model_type} model version {version} (SHA256: {sha256_hash[:8]})")
        return sha256_hash
    
    def activate_version(self, model_type: str, version: str) -> bool:
        """Activate a specific model version (hot-swap).
        
        Args:
            model_type: Type of model (router, hand, leg)
            version: Version to activate
            
        Returns:
            True if activation successful
        """
        model_key = f"{model_type}:{version}"
        
        if model_key not in self.registry_data["models"]:
            logger.error(f"Model version not found: {model_key}")
            return False
        
        # Verify model file exists and integrity
        model_info = self.registry_data["models"][model_key]
        model_file = Path(model_info["file_path"])
        
        if not model_file.exists():
            logger.error(f"Model file not found: {model_file}")
            return False
        
        # Verify SHA256
        current_hash = self._calculate_sha256(model_file)
        if current_hash != model_info["sha256"]:
            logger.error(f"Model integrity check failed for {model_key}")
            return False
        
        # Record previous active version
        previous_version = self.registry_data["active_versions"].get(model_type)
        
        # Activate new version
        self.registry_data["active_versions"][model_type] = version
        
        # Add to audit trail
        self.registry_data["audit_trail"].append({
            "action": "activate",
            "model_type": model_type,
            "version": version,
            "previous_version": previous_version,
            "sha256": model_info["sha256"],
            "timestamp": datetime.utcnow().isoformat()
        })
        
        self._save_registry()
        
        logger.info(f"Activated {model_type} model version {version}")
        return True
    
    def get_active_version(self, model_type: str) -> Optional[str]:
        """Get currently active version for a model type.
        
        Args:
            model_type: Type of model (router, hand, leg)
            
        Returns:
            Active version or None if not set
        """
        return self.registry_data["active_versions"].get(model_type)
    
    def get_model_info(self, model_type: str, version: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific model version.
        
        Args:
            model_type: Type of model (router, hand, leg)
            version: Version identifier
            
        Returns:
            Model information or None if not found
        """
        model_key = f"{model_type}:{version}"
        return self.registry_data["models"].get(model_key)
    
    def list_versions(self, model_type: str) -> List[str]:
        """List all versions for a model type.
        
        Args:
            model_type: Type of model (router, hand, leg)
            
        Returns:
            List of version identifiers
        """
        versions = []
        for model_key in self.registry_data["models"]:
            if model_key.startswith(f"{model_type}:"):
                version = model_key.split(":", 1)[1]
                versions.append(version)
        
        return sorted(versions)
    
    def get_model_data(self, model_type: str, version: Optional[str] = None) -> Optional[bytes]:
        """Get model binary data.
        
        Args:
            model_type: Type of model (router, hand, leg)
            version: Version identifier (uses active version if None)
            
        Returns:
            Model binary data or None if not found
        """
        if version is None:
            version = self.get_active_version(model_type)
            if version is None:
                logger.warning(f"No active version set for {model_type}")
                return None
        
        model_info = self.get_model_info(model_type, version)
        if not model_info:
            logger.warning(f"Model not found: {model_type}:{version}")
            return None
        
        model_file = Path(model_info["file_path"])
        if not model_file.exists():
            logger.error(f"Model file not found: {model_file}")
            return None
        
        try:
            with open(model_file, 'rb') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to read model file {model_file}: {e}")
            return None
    
    def get_audit_trail(self, model_type: Optional[str] = None, 
                       limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get audit trail entries.
        
        Args:
            model_type: Filter by model type (optional)
            limit: Maximum number of entries to return (optional)
            
        Returns:
            List of audit trail entries
        """
        trail = self.registry_data["audit_trail"]
        
        if model_type:
            trail = [entry for entry in trail if entry.get("model_type") == model_type]
        
        # Sort by timestamp (newest first)
        trail = sorted(trail, key=lambda x: x.get("timestamp", ""), reverse=True)
        
        if limit:
            trail = trail[:limit]
        
        return trail
    
    def verify_integrity(self, model_type: str, version: str) -> bool:
        """Verify model file integrity using SHA256.
        
        Args:
            model_type: Type of model (router, hand, leg)
            version: Version identifier
            
        Returns:
            True if integrity check passes
        """
        model_info = self.get_model_info(model_type, version)
        if not model_info:
            return False
        
        model_file = Path(model_info["file_path"])
        if not model_file.exists():
            return False
        
        current_hash = self._calculate_sha256(model_file)
        expected_hash = model_info["sha256"]
        
        return current_hash == expected_hash
    
    def get_registry_stats(self) -> Dict[str, Any]:
        """Get registry statistics.
        
        Returns:
            Dictionary with registry statistics
        """
        stats = {
            "total_models": len(self.registry_data["models"]),
            "model_types": {},
            "active_versions": self.registry_data["active_versions"].copy(),
            "audit_entries": len(self.registry_data["audit_trail"])
        }
        
        # Count models by type
        for model_key in self.registry_data["models"]:
            model_type = model_key.split(":", 1)[0]
            if model_type not in stats["model_types"]:
                stats["model_types"][model_type] = 0
            stats["model_types"][model_type] += 1
        
        return stats


# Global model registry instance
model_registry = ModelRegistry()