"""Hospitals Agent for finding nearby medical facilities."""

import asyncio
import time
from typing import Dict, List, Optional, Any, Tuple
from loguru import logger


class HospitalAgent:
    """Agent for finding nearby hospitals and medical facilities."""
    
    def __init__(self):
        """Initialize hospitals agent."""
        self.agent_name = "hospitals"
        self.version = "1.0.0"
        logger.info(f"HospitalAgent {self.version} initialized")
    
    async def find_hospitals(self, location: str, urgency: str, specialty: str = "orthopedic") -> Dict[str, Any]:
        """
        Find nearby hospitals based on location and urgency.
        
        Args:
            location: Location string or coordinates
            urgency: Urgency level (RED/AMBER/GREEN)
            specialty: Medical specialty
            
        Returns:
            Dict containing hospital recommendations
        """
        try:
            # Mock hospital data - in production, integrate with real hospital APIs
            hospitals = [
                {
                    "name": "City General Hospital",
                    "address": "123 Medical Center Drive",
                    "distance": "2.3 miles",
                    "emergency_room": True,
                    "orthopedic_services": True,
                    "phone": "(555) 123-4567",
                    "rating": 4.2
                },
                {
                    "name": "Regional Medical Center", 
                    "address": "456 Health Plaza",
                    "distance": "4.1 miles",
                    "emergency_room": True,
                    "orthopedic_services": True,
                    "phone": "(555) 234-5678",
                    "rating": 4.5
                },
                {
                    "name": "Orthopedic Specialists Clinic",
                    "address": "789 Bone & Joint Way",
                    "distance": "3.7 miles", 
                    "emergency_room": False,
                    "orthopedic_services": True,
                    "phone": "(555) 345-6789",
                    "rating": 4.8
                }
            ]
            
            # Filter based on urgency
            if urgency == "RED":
                # Only emergency rooms for urgent cases
                filtered_hospitals = [h for h in hospitals if h["emergency_room"]]
                recommendation = "Go to the nearest emergency room immediately"
            elif urgency == "AMBER":
                # All hospitals with orthopedic services
                filtered_hospitals = [h for h in hospitals if h["orthopedic_services"]]
                recommendation = "Schedule an urgent appointment or visit emergency room"
            else:
                # All facilities including clinics
                filtered_hospitals = hospitals
                recommendation = "Schedule a routine appointment with an orthopedic specialist"
            
            return {
                "hospitals": filtered_hospitals[:3],  # Return top 3
                "location_searched": location,
                "urgency_level": urgency,
                "specialty": specialty,
                "recommendation": recommendation,
                "emergency_number": "911"
            }
            
        except Exception as e:
            logger.error(f"Hospital search failed: {e}")
            return {
                "hospitals": [],
                "error": str(e),
                "emergency_number": "911",
                "recommendation": "Contact emergency services if urgent"
            }
    
    async def find_nearby_facilities(
        self,
        consents: Dict[str, Any],
        location: Optional[Dict[str, Any]] = None,
        specialty: str = "orthopedic",
        max_results: int = 5,
        max_distance_km: float = 50.0
    ) -> Dict[str, Any]:
        """
        Find nearby medical facilities.
        
        Args:
            consents: User consent dictionary (must include geolocation=true)
            location: Optional location dict with lat/lng (if not provided, uses IP geolocation)
            specialty: Medical specialty to search for (default: orthopedic)
            max_results: Maximum number of results to return (default: 5)
            max_distance_km: Maximum distance in kilometers (default: 50km)
            
        Returns:
            Dict containing facilities list or error message
        """
        start_time = time.time()
        import uuid
        request_id = f"hosp_{int(time.time() * 1000)}_{str(uuid.uuid4())[:8]}"
        
        logger.info(f"[{request_id}] Starting hospital search")
        
        try:
            # Check geolocation consent
            if not self._check_geolocation_consent(consents):
                return self._create_consent_error_response(request_id, start_time)
            
            # Validate and prepare location
            search_location = await self._prepare_location(location)
            
            # Search for facilities
            facilities = await self.provider.search_facilities(
                location=search_location,
                specialty=specialty,
                max_results=max_results,
                max_distance_km=max_distance_km
            )
            
            # Process and validate results
            processed_facilities = self._process_facilities(facilities, search_location)
            
            result = {
                "facilities": processed_facilities,
                "search_criteria": {
                    "specialty": specialty,
                    "max_results": max_results,
                    "max_distance_km": max_distance_km,
                    "location": search_location
                },
                "agent": self.agent_name,
                "version": self.version,
                "request_id": request_id,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "timestamp": time.time(),
                "provider": type(self.provider).__name__
            }
            
            logger.info(f"[{request_id}] Found {len(processed_facilities)} facilities in {result['processing_time_ms']}ms")
            
            return result
            
        except Exception as e:
            logger.error(f"[{request_id}] Hospital search failed: {e}")
            
            return {
                "facilities": [],
                "error": str(e),
                "agent": self.agent_name,
                "version": self.version,
                "request_id": request_id,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "timestamp": time.time(),
                "provider": type(self.provider).__name__
            }
    
    def _check_geolocation_consent(self, consents: Dict[str, Any]) -> bool:
        """Check if user has provided geolocation consent."""
        if not isinstance(consents, dict):
            return False
        
        geolocation_consent = consents.get("geolocation", False)
        
        # Accept various truthy values
        if isinstance(geolocation_consent, bool):
            return geolocation_consent
        elif isinstance(geolocation_consent, str):
            return geolocation_consent.lower() in ["true", "yes", "1", "on"]
        elif isinstance(geolocation_consent, (int, float)):
            return bool(geolocation_consent)
        
        return False
    
    def _create_consent_error_response(self, request_id: str, start_time: float) -> Dict[str, Any]:
        """Create error response for missing geolocation consent."""
        return {
            "facilities": [],
            "error": "geolocation_consent_required",
            "error_message": "Geolocation consent is required to search for nearby medical facilities. Please enable location sharing to use this feature.",
            "consent_info": {
                "required_consent": "geolocation",
                "description": "We need your location to find nearby hospitals and medical facilities",
                "data_usage": "Location data is used only for facility search and is not stored"
            },
            "agent": self.agent_name,
            "version": self.version,
            "request_id": request_id,
            "processing_time_ms": round((time.time() - start_time) * 1000, 2),
            "timestamp": time.time(),
            "provider": type(self.provider).__name__
        }
    
    async def _prepare_location(self, location: Optional[Dict[str, Any]]) -> Dict[str, float]:
        """Prepare and validate location for search."""
        if location and isinstance(location, dict):
            # Use provided location
            lat = location.get("latitude") or location.get("lat")
            lng = location.get("longitude") or location.get("lng") or location.get("lon")
            
            if lat is not None and lng is not None:
                try:
                    return {
                        "latitude": float(lat),
                        "longitude": float(lng)
                    }
                except (ValueError, TypeError):
                    pass
        
        # Fallback to default location (could be IP geolocation in real implementation)
        logger.warning("No valid location provided, using default location")
        return {
            "latitude": 40.7128,  # New York City as default
            "longitude": -74.0060
        }
    
    def _process_facilities(
        self, 
        facilities: List[Dict[str, Any]], 
        search_location: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Process and validate facility results."""
        processed = []
        
        for facility in facilities:
            try:
                # Validate required fields
                if not all(key in facility for key in ["name", "address", "phone"]):
                    continue
                
                # Calculate distance if not provided
                distance_km = facility.get("distance_km")
                if distance_km is None and "latitude" in facility and "longitude" in facility:
                    distance_km = self._calculate_distance(
                        search_location["latitude"],
                        search_location["longitude"],
                        facility["latitude"],
                        facility["longitude"]
                    )
                
                processed_facility = {
                    "name": str(facility["name"]).strip(),
                    "address": str(facility["address"]).strip(),
                    "phone": str(facility["phone"]).strip(),
                    "distance_km": round(distance_km, 1) if distance_km is not None else None,
                    "specialty": facility.get("specialty", "general"),
                    "rating": facility.get("rating"),
                    "website": facility.get("website"),
                    "emergency_services": facility.get("emergency_services", False)
                }
                
                # Remove None values
                processed_facility = {k: v for k, v in processed_facility.items() if v is not None}
                
                processed.append(processed_facility)
                
            except Exception as e:
                logger.warning(f"Failed to process facility: {e}")
                continue
        
        # Sort by distance if available
        processed.sort(key=lambda f: f.get("distance_km", float('inf')))
        
        return processed
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points using Haversine formula."""
        import math
        
        # Convert latitude and longitude from degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        
        return c * r
    
    def set_provider(self, provider):
        """Set the hospital data provider (for dependency injection)."""
        self.provider = provider
        logger.info(f"Hospital provider changed to {type(provider).__name__}")


class MockHospitalProvider:
    """Mock hospital data provider for testing and development."""
    
    def __init__(self):
        """Initialize mock provider with sample data."""
        self.mock_facilities = [
            {
                "name": "General Hospital",
                "address": "123 Main Street, New York, NY 10001",
                "phone": "(555) 123-4567",
                "latitude": 40.7589,
                "longitude": -73.9851,
                "specialty": "orthopedic",
                "rating": 4.2,
                "website": "https://generalhospital.example.com",
                "emergency_services": True
            },
            {
                "name": "Orthopedic Specialty Center",
                "address": "456 Medical Plaza, New York, NY 10002",
                "phone": "(555) 234-5678",
                "latitude": 40.7505,
                "longitude": -73.9934,
                "specialty": "orthopedic",
                "rating": 4.7,
                "website": "https://orthospecialty.example.com",
                "emergency_services": False
            },
            {
                "name": "City Medical Center",
                "address": "789 Health Avenue, New York, NY 10003",
                "phone": "(555) 345-6789",
                "latitude": 40.7282,
                "longitude": -73.9942,
                "specialty": "general",
                "rating": 4.0,
                "website": "https://citymedical.example.com",
                "emergency_services": True
            },
            {
                "name": "Advanced Bone & Joint Clinic",
                "address": "321 Wellness Drive, New York, NY 10004",
                "phone": "(555) 456-7890",
                "latitude": 40.7061,
                "longitude": -74.0087,
                "specialty": "orthopedic",
                "rating": 4.5,
                "emergency_services": False
            },
            {
                "name": "Emergency Medical Hospital",
                "address": "654 Urgent Care Blvd, New York, NY 10005",
                "phone": "(555) 567-8901",
                "latitude": 40.6892,
                "longitude": -74.0445,
                "specialty": "emergency",
                "rating": 3.8,
                "website": "https://emergencymed.example.com",
                "emergency_services": True
            }
        ]
    
    async def search_facilities(
        self,
        location: Dict[str, float],
        specialty: str = "orthopedic",
        max_results: int = 5,
        max_distance_km: float = 50.0
    ) -> List[Dict[str, Any]]:
        """Search for facilities using mock data."""
        
        # Simulate API delay
        await asyncio.sleep(0.1)
        
        # Filter by specialty (orthopedic or general)
        if specialty == "orthopedic":
            filtered = [f for f in self.mock_facilities if f["specialty"] in ["orthopedic", "general"]]
        else:
            filtered = [f for f in self.mock_facilities if f["specialty"] == specialty or f["specialty"] == "general"]
        
        # Calculate distances
        for facility in filtered:
            if "latitude" in facility and "longitude" in facility:
                facility["distance_km"] = self._calculate_distance(
                    location["latitude"],
                    location["longitude"],
                    facility["latitude"],
                    facility["longitude"]
                )
        
        # Filter by distance
        filtered = [f for f in filtered if f.get("distance_km", 0) <= max_distance_km]
        
        # Sort by distance
        filtered.sort(key=lambda f: f.get("distance_km", float('inf')))
        
        # Limit results
        return filtered[:max_results]
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points using Haversine formula."""
        import math
        
        # Convert latitude and longitude from degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        
        return c * r


class RealHospitalProvider:
    """Real hospital data provider interface (to be implemented with actual APIs)."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize real provider with API credentials."""
        self.api_key = api_key
        # This would initialize connections to real APIs like:
        # - Google Places API
        # - Yelp API
        # - Healthcare.gov API
        # - Hospital-specific APIs
        pass
    
    async def search_facilities(
        self,
        location: Dict[str, float],
        specialty: str = "orthopedic",
        max_results: int = 5,
        max_distance_km: float = 50.0
    ) -> List[Dict[str, Any]]:
        """Search for facilities using real APIs."""
        # This would implement actual API calls to:
        # 1. Search for hospitals/clinics near location
        # 2. Filter by specialty
        # 3. Get ratings, contact info, etc.
        # 4. Return standardized facility data
        raise NotImplementedError("Real hospital provider not yet implemented")


# Global hospitals agent instance
hospitals_agent = HospitalAgent()