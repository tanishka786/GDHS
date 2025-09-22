"""MCP (Model Context Protocol) tool handlers for AI assistant integration."""

from typing import Dict, Any, List, Optional
from loguru import logger

from schemas.chat import MCPToolDefinition
from agents.diagnosis import DiagnosisAgent
from agents.triage import TriageAgent
from agents.hospitals import HospitalAgent


class MCPToolHandler:
    """Handles MCP (Model Context Protocol) tool calls for AI assistants."""
    
    def __init__(self):
        """Initialize the MCP tool handler."""
        self.available_tools = {
            "orthopedic_knowledge": self.orthopedic_knowledge_tool,
            "symptom_analysis": self.symptom_analysis_tool,
            "condition_lookup": self.condition_lookup_tool,
            "treatment_recommendations": self.treatment_recommendations_tool,
            "anatomical_reference": self.anatomical_reference_tool,
            "hospital_finder": self.hospital_finder_tool,
            "triage_assessment": self.triage_assessment_tool,
            "fracture_classifier": self.fracture_classifier_tool
        }
        
        # Initialize agents
        self.diagnosis_agent = DiagnosisAgent()
        self.triage_agent = TriageAgent()
        self.hospital_agent = HospitalAgent()
        
        logger.info(f"Initialized MCP tool handler with {len(self.available_tools)} tools")
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute MCP tool and return results."""
        if tool_name not in self.available_tools:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        try:
            result = await self.available_tools[tool_name](parameters)
            logger.info(f"Successfully executed MCP tool: {tool_name}")
            return result
        except Exception as e:
            logger.error(f"Failed to execute MCP tool {tool_name}: {e}")
            return {
                "tool": tool_name,
                "result": None,
                "status": "error",
                "error": str(e)
            }
    
    async def orthopedic_knowledge_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Tool for orthopedic knowledge queries."""
        query = params.get("query", "")
        
        # Basic orthopedic knowledge base
        knowledge_base = {
            "fracture types": {
                "response": """Common fracture types include:
                1. **Hairline Fractures**: Small cracks that don't go completely through the bone
                2. **Simple Fractures**: Clean breaks with minimal bone displacement
                3. **Compound Fractures**: Bone breaks through the skin (open fractures)
                4. **Comminuted Fractures**: Bone shatters into multiple pieces
                5. **Stress Fractures**: Small cracks from repetitive force or overuse""",
                "confidence": 0.95
            },
            "hand bones": {
                "response": """The hand contains 27 bones:
                1. **Phalanges**: 14 finger bones (3 per finger, 2 per thumb)
                2. **Metacarpals**: 5 palm bones connecting fingers to wrist
                3. **Carpals**: 8 wrist bones arranged in two rows""",
                "confidence": 0.98
            },
            "leg bones": {
                "response": """Major leg bones include:
                1. **Femur**: Thigh bone (longest bone in body)
                2. **Tibia**: Larger shin bone (weight-bearing)
                3. **Fibula**: Smaller shin bone (lateral support)
                4. **Patella**: Kneecap
                5. **Foot bones**: 26 bones including tarsals, metatarsals, and phalanges""",
                "confidence": 0.98
            }
        }
        
        # Simple keyword matching
        query_lower = query.lower()
        best_match = None
        best_score = 0
        
        for topic, data in knowledge_base.items():
            if any(word in query_lower for word in topic.split()):
                score = sum(word in query_lower for word in topic.split()) / len(topic.split())
                if score > best_score:
                    best_score = score
                    best_match = data
        
        if best_match:
            knowledge_response = {
                "query": query,
                "response": best_match["response"],
                "references": ["OrthoAssist Knowledge Base", "Medical Literature"],
                "confidence": best_match["confidence"]
            }
        else:
            knowledge_response = {
                "query": query,
                "response": f"I can help with orthopedic questions about fractures, bone anatomy, and injuries. Your query '{query}' doesn't match my current knowledge base. Try asking about fracture types, hand bones, or leg bones.",
                "references": ["OrthoAssist Knowledge Base"],
                "confidence": 0.3
            }
        
        return {
            "tool": "orthopedic_knowledge",
            "result": knowledge_response,
            "status": "success"
        }
    
    async def symptom_analysis_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Tool for symptom analysis without X-ray."""
        symptoms = params.get("symptoms", [])
        body_part = params.get("body_part", "")
        age = params.get("age")
        
        # Convert symptoms to string if it's a list
        if isinstance(symptoms, list):
            symptoms_text = ", ".join(symptoms)
        else:
            symptoms_text = str(symptoms)
        
        try:
            # Use diagnosis agent for symptom analysis
            analysis = await self.diagnosis_agent.analyze_symptoms(symptoms_text, body_part, age)
            
            return {
                "tool": "symptom_analysis",
                "result": analysis,
                "status": "success"
            }
        except Exception as e:
            return {
                "tool": "symptom_analysis",
                "result": {
                    "symptoms": symptoms_text,
                    "body_part": body_part,
                    "possible_conditions": ["Symptom analysis requires medical evaluation"],
                    "recommendations": ["Please consult a healthcare professional for proper diagnosis"],
                    "confidence": 0.1
                },
                "status": "partial",
                "error": str(e)
            }
    
    async def hospital_finder_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Tool for finding nearby hospitals and specialists."""
        location = params.get("location", "")
        urgency_level = params.get("urgency_level", "AMBER")
        specialty = params.get("specialty", "orthopedic")
        
        try:
            recommendations = await self.hospital_agent.find_hospitals(
                location=location,
                urgency=urgency_level,
                specialty=specialty
            )
            
            return {
                "tool": "hospital_finder",
                "result": recommendations,
                "status": "success"
            }
        except Exception as e:
            return {
                "tool": "hospital_finder",
                "result": {
                    "hospitals": [],
                    "message": "Unable to find hospitals at this time. Please contact emergency services if urgent.",
                    "emergency_number": "911"
                },
                "status": "error",
                "error": str(e)
            }
    
    async def triage_assessment_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Tool for medical triage assessment."""
        symptoms = params.get("symptoms", "")
        findings = params.get("findings", {})
        patient_age = params.get("age")
        
        try:
            assessment = await self.triage_agent.assess_from_symptoms(
                symptoms=symptoms,
                findings=findings,
                age=patient_age
            )
            
            return {
                "tool": "triage_assessment",
                "result": assessment,
                "status": "success"
            }
        except Exception as e:
            return {
                "tool": "triage_assessment",
                "result": {
                    "level": "AMBER",
                    "priority": "medium",
                    "recommendation": "Seek medical attention within 24-48 hours",
                    "confidence": 0.3
                },
                "status": "error",
                "error": str(e)
            }
    
    async def condition_lookup_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Tool for looking up medical conditions."""
        condition_name = params.get("condition", "")
        
        # Basic condition information
        conditions = {
            "hairline fracture": {
                "description": "A small crack in the bone that doesn't go completely through",
                "symptoms": ["Pain", "Swelling", "Tenderness", "Limited mobility"],
                "treatment": ["Rest", "Immobilization", "Pain management", "Follow-up imaging"],
                "healing_time": "6-12 weeks"
            },
            "simple fracture": {
                "description": "A clean break in the bone with minimal displacement",
                "symptoms": ["Severe pain", "Swelling", "Deformity", "Inability to bear weight"],
                "treatment": ["Casting", "Splinting", "Pain management", "Physical therapy"],
                "healing_time": "8-16 weeks"
            },
            "sprain": {
                "description": "Injury to ligaments around a joint",
                "symptoms": ["Pain", "Swelling", "Bruising", "Limited range of motion"],
                "treatment": ["RICE protocol", "Anti-inflammatory medication", "Physical therapy"],
                "healing_time": "2-8 weeks"
            }
        }
        
        condition_lower = condition_name.lower()
        condition_info = conditions.get(condition_lower, {
            "description": f"Information about '{condition_name}' is not available in the basic database",
            "recommendation": "Please consult medical literature or healthcare professional"
        })
        
        return {
            "tool": "condition_lookup",
            "result": {
                "condition": condition_name,
                "information": condition_info
            },
            "status": "success"
        }
    
    async def treatment_recommendations_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Tool for treatment recommendations."""
        condition = params.get("condition", "")
        severity = params.get("severity", "moderate")
        
        # Basic treatment guidelines
        treatments = {
            "fracture": {
                "immediate": ["Immobilization", "Pain management", "Ice application"],
                "short_term": ["Medical evaluation", "Imaging", "Casting/splinting"],
                "long_term": ["Physical therapy", "Follow-up imaging", "Gradual activity increase"]
            },
            "sprain": {
                "immediate": ["RICE protocol", "Pain relief", "Avoid weight bearing"],
                "short_term": ["Medical evaluation", "Anti-inflammatory medication"],
                "long_term": ["Physical therapy", "Strengthening exercises", "Gradual return to activity"]
            }
        }
        
        # Simple matching
        treatment_plan = None
        for key, plan in treatments.items():
            if key in condition.lower():
                treatment_plan = plan
                break
        
        if not treatment_plan:
            treatment_plan = {
                "immediate": ["Seek medical attention", "Avoid further injury"],
                "short_term": ["Professional medical evaluation"],
                "long_term": ["Follow medical advice"]
            }
        
        return {
            "tool": "treatment_recommendations",
            "result": {
                "condition": condition,
                "severity": severity,
                "treatment_plan": treatment_plan,
                "disclaimer": "These are general guidelines. Always consult healthcare professionals for personalized treatment."
            },
            "status": "success"
        }
    
    async def anatomical_reference_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Tool for anatomical references."""
        body_part = params.get("body_part", "")
        
        anatomy_data = {
            "hand": {
                "bones": ["Phalanges", "Metacarpals", "Carpals"],
                "joints": ["DIP", "PIP", "MCP", "Wrist"],
                "common_injuries": ["Metacarpal fractures", "Scaphoid fractures", "Finger fractures"]
            },
            "wrist": {
                "bones": ["Radius", "Ulna", "8 Carpal bones"],
                "joints": ["Radiocarpal", "Midcarpal", "Radioulnar"],
                "common_injuries": ["Colles fracture", "Scaphoid fracture", "TFCC tears"]
            },
            "leg": {
                "bones": ["Femur", "Tibia", "Fibula", "Patella"],
                "joints": ["Hip", "Knee", "Ankle"],
                "common_injuries": ["Femur fractures", "Tibial fractures", "Ankle fractures"]
            }
        }
        
        anatomy_info = anatomy_data.get(body_part.lower(), {
            "message": f"Anatomical information for '{body_part}' not found in database"
        })
        
        return {
            "tool": "anatomical_reference",
            "result": {
                "body_part": body_part,
                "anatomy": anatomy_info
            },
            "status": "success"
        }
    
    async def fracture_classifier_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Tool for fracture classification."""
        fracture_description = params.get("description", "")
        location = params.get("location", "")
        
        # Basic fracture classification
        classification = {
            "type": "Simple fracture",
            "displacement": "Minimal",
            "stability": "Stable",
            "urgency": "AMBER",
            "treatment_approach": "Conservative management"
        }
        
        # Simple keyword-based classification
        if any(word in fracture_description.lower() for word in ["compound", "open", "through skin"]):
            classification.update({
                "type": "Open fracture",
                "urgency": "RED",
                "treatment_approach": "Immediate surgical intervention"
            })
        elif any(word in fracture_description.lower() for word in ["hairline", "crack", "small"]):
            classification.update({
                "type": "Hairline fracture",
                "urgency": "GREEN",
                "treatment_approach": "Conservative management"
            })
        
        return {
            "tool": "fracture_classifier",
            "result": {
                "description": fracture_description,
                "location": location,
                "classification": classification
            },
            "status": "success"
        }
    
    def get_available_tools(self, context: str = "general") -> List[MCPToolDefinition]:
        """Get available MCP tools based on context."""
        base_tools = [
            MCPToolDefinition(
                name="orthopedic_knowledge",
                description="Query orthopedic medical knowledge base",
                parameters={
                    "query": {"type": "string", "description": "Medical query about orthopedic conditions"}
                }
            ),
            MCPToolDefinition(
                name="symptom_analysis",
                description="Analyze symptoms without X-ray imaging",
                parameters={
                    "symptoms": {"type": "string", "description": "List of patient symptoms"},
                    "body_part": {"type": "string", "description": "Affected body part"},
                    "age": {"type": "integer", "description": "Patient age (optional)"}
                }
            ),
            MCPToolDefinition(
                name="hospital_finder",
                description="Find nearby hospitals and specialists",
                parameters={
                    "location": {"type": "string", "description": "Patient location"},
                    "urgency_level": {"type": "string", "description": "Urgency level (RED/AMBER/GREEN)"},
                    "specialty": {"type": "string", "description": "Medical specialty needed"}
                }
            )
        ]
        
        if context == "post_analysis":
            base_tools.extend([
                MCPToolDefinition(
                    name="treatment_recommendations",
                    description="Get treatment recommendations for diagnosed condition",
                    parameters={
                        "condition": {"type": "string", "description": "Diagnosed condition"},
                        "severity": {"type": "string", "description": "Condition severity"}
                    }
                ),
                MCPToolDefinition(
                    name="fracture_classifier",
                    description="Classify fracture type and severity",
                    parameters={
                        "description": {"type": "string", "description": "Fracture description"},
                        "location": {"type": "string", "description": "Fracture location"}
                    }
                )
            ])
        
        return base_tools


# Global MCP tool handler instance
mcp_tool_handler = MCPToolHandler()