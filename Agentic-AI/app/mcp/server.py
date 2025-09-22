"""MCP Server implementation for Orthopedic Assistant."""

import asyncio
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from loguru import logger

from app.config import config


@dataclass
class Tool:
    """MCP Tool definition."""
    name: str
    description: str
    input_schema: Dict[str, Any]


@dataclass
class Resource:
    """MCP Resource definition."""
    uri: str
    name: str
    description: str
    mime_type: Optional[str] = None


class OrthopedicMCPServer:
    """Main MCP server for orthopedic assistance."""
    
    def __init__(self):
        self.tools: Dict[str, Tool] = {}
        self.resources: Dict[str, Resource] = {}
        self._initialized = False
        logger.info("OrthopedicMCPServer initialized")
    
    async def initialize(self, client_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Initialize the MCP server."""
        try:
            logger.info("Initializing MCP server...")
            
            # Register core tools
            await self._register_tools()
            
            # Register resources
            await self._register_resources()
            
            self._initialized = True
            
            response = {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {
                        "listChanged": True
                    },
                    "resources": {
                        "subscribe": True,
                        "listChanged": True
                    }
                },
                "serverInfo": {
                    "name": "orthopedic-assistant-mcp",
                    "version": "0.1.0",
                    "description": "Specialized orthopedic medical assistance MCP server"
                }
            }
            
            logger.info(f"MCP server initialized with {len(self.tools)} tools and {len(self.resources)} resources")
            return response
            
        except Exception as e:
            logger.error(f"Failed to initialize MCP server: {e}")
            raise
    
    async def list_tools(self) -> Dict[str, Any]:
        """List all available tools."""
        if not self._initialized:
            raise RuntimeError("Server not initialized")
        
        tools_list = []
        for tool in self.tools.values():
            tools_list.append({
                "name": tool.name,
                "description": tool.description,
                "inputSchema": tool.input_schema
            })
        
        logger.debug(f"Listed {len(tools_list)} tools")
        return {"tools": tools_list}
    
    async def call_tool(self, name: str, arguments: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Call a specific tool."""
        if not self._initialized:
            raise RuntimeError("Server not initialized")
        
        if name not in self.tools:
            raise ValueError(f"Tool '{name}' not found")
        
        logger.info(f"Calling tool: {name}")
        
        try:
            # Route to appropriate tool handler
            if name == "health_check":
                return await self._handle_health_check(arguments or {})
            elif name == "get_bone_info":
                return await self._handle_get_bone_info(arguments or {})
            elif name == "suggest_conditions":
                return await self._handle_suggest_conditions(arguments or {})
            elif name == "analyze_xray":
                return await self._handle_analyze_xray(arguments or {})
            elif name == "generate_medical_summary":
                return await self._handle_generate_medical_summary(arguments or {})
            else:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Tool '{name}' is registered but not yet implemented"
                    }],
                    "isError": False
                }
                
        except Exception as e:
            logger.error(f"Error calling tool '{name}': {e}")
            return {
                "content": [{
                    "type": "text", 
                    "text": f"Error executing tool '{name}': {str(e)}"
                }],
                "isError": True
            }
    
    async def list_resources(self) -> Dict[str, Any]:
        """List all available resources."""
        if not self._initialized:
            raise RuntimeError("Server not initialized")
        
        resources_list = []
        for resource in self.resources.values():
            resource_dict = {
                "uri": resource.uri,
                "name": resource.name,
                "description": resource.description
            }
            if resource.mime_type:
                resource_dict["mimeType"] = resource.mime_type
            resources_list.append(resource_dict)
        
        logger.debug(f"Listed {len(resources_list)} resources")
        return {"resources": resources_list}
    
    async def _register_tools(self):
        """Register all available tools."""
        # Health check tool
        self.tools["health_check"] = Tool(
            name="health_check",
            description="Check server health and tool registration status",
            input_schema={
                "type": "object",
                "properties": {},
                "required": []
            }
        )
        
        # Anatomical reference tools
        self.tools["get_bone_info"] = Tool(
            name="get_bone_info",
            description="Retrieve detailed bone anatomy and characteristics",
            input_schema={
                "type": "object",
                "properties": {
                    "bone_name": {
                        "type": "string",
                        "description": "Name of the bone to query"
                    }
                },
                "required": ["bone_name"]
            }
        )
        
        # Diagnostic assistance tools
        self.tools["suggest_conditions"] = Tool(
            name="suggest_conditions",
            description="Provide differential diagnosis suggestions based on symptoms",
            input_schema={
                "type": "object",
                "properties": {
                    "symptoms": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of symptoms to analyze"
                    },
                    "body_part": {
                        "type": "string",
                        "description": "Affected body part (optional)"
                    }
                },
                "required": ["symptoms"]
            }
        )
        
        # Image analysis tools
        self.tools["analyze_xray"] = Tool(
            name="analyze_xray",
            description="Analyze X-ray images for fracture detection and medical assessment",
            input_schema={
                "type": "object",
                "properties": {
                    "image_data": {
                        "type": "string",
                        "description": "Base64 encoded image data"
                    },
                    "image_filename": {
                        "type": "string",
                        "description": "Original filename of the image"
                    },
                    "symptoms": {
                        "type": "string",
                        "description": "Patient symptoms (optional)"
                    },
                    "urgency_level": {
                        "type": "string",
                        "enum": ["routine", "urgent", "emergency"],
                        "description": "Clinical priority level"
                    }
                },
                "required": ["image_data"]
            }
        )
        
        # Medical summary generation
        self.tools["generate_medical_summary"] = Tool(
            name="generate_medical_summary",
            description="Generate patient-friendly medical summary from analysis results",
            input_schema={
                "type": "object",
                "properties": {
                    "triage_result": {
                        "type": "object",
                        "description": "Triage assessment results"
                    },
                    "detections": {
                        "type": "array",
                        "description": "Detection results from image analysis"
                    },
                    "symptoms": {
                        "type": "string",
                        "description": "Patient symptoms"
                    },
                    "body_part": {
                        "type": "string",
                        "description": "Detected body part"
                    }
                },
                "required": ["triage_result", "detections"]
            }
        )
        
        logger.info(f"Registered {len(self.tools)} tools")
    
    async def _register_resources(self):
        """Register all available resources."""
        # Medical knowledge base
        self.resources["medical_kb"] = Resource(
            uri="orthopedic://knowledge-base/medical",
            name="Medical Knowledge Base",
            description="Orthopedic medical knowledge and reference data"
        )
        
        # Anatomical atlas
        self.resources["anatomical_atlas"] = Resource(
            uri="orthopedic://atlas/anatomy",
            name="Anatomical Atlas",
            description="Comprehensive orthopedic anatomical reference"
        )
        
        logger.info(f"Registered {len(self.resources)} resources")
    
    async def _handle_health_check(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle health check tool call."""
        tool_summary = {
            "total_tools": len(self.tools),
            "total_resources": len(self.resources),
            "tools": list(self.tools.keys()),
            "resources": list(self.resources.keys()),
            "server_status": "healthy",
            "configuration": {
                "groq_configured": bool(config.groq_api_key and config.groq_api_key != "your_groq_api_key_here"),
                "storage_type": config.storage_type,
                "medical_disclaimer_enabled": config.medical_disclaimer_enabled,
                "phi_redaction_enabled": config.phi_redaction_enabled
            }
        }
        
        return {
            "content": [{
                "type": "text",
                "text": f"Server Health Check\n\nStatus: {tool_summary['server_status']}\nTools: {tool_summary['total_tools']}\nResources: {tool_summary['total_resources']}\n\nRegistered Tools:\n" + "\n".join(f"- {tool}" for tool in tool_summary['tools'])
            }],
            "isError": False
        }
    
    async def _handle_get_bone_info(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle bone info tool call (placeholder implementation)."""
        bone_name = arguments.get("bone_name", "")
        
        # Medical disclaimer
        disclaimer = "\n\n⚠️ MEDICAL DISCLAIMER: This information is for educational purposes only and should not replace professional medical advice, diagnosis, or treatment."
        
        return {
            "content": [{
                "type": "text",
                "text": f"Bone Information Request: {bone_name}\n\nThis tool is registered but requires implementation of the anatomical database.{disclaimer}"
            }],
            "isError": False
        }
    
    async def _handle_suggest_conditions(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle condition suggestion tool call (placeholder implementation)."""
        symptoms = arguments.get("symptoms", [])
        body_part = arguments.get("body_part", "")
        
        # Medical disclaimer
        disclaimer = "\n\n⚠️ MEDICAL DISCLAIMER: These suggestions are for educational purposes only. Professional medical evaluation is required for accurate diagnosis and treatment."
        
        return {
            "content": [{
                "type": "text",
                "text": f"Condition Suggestions Request\nSymptoms: {', '.join(symptoms)}\nBody Part: {body_part or 'Not specified'}\n\nThis tool is registered but requires implementation of the diagnostic engine.{disclaimer}"
            }],
            "isError": False
        }
    
    async def _handle_analyze_xray(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle X-ray analysis tool call."""
        try:
            logger.info("Starting MCP X-ray analysis...")
            
            from services.body_part_detector import body_part_detector
            from services.groq_service import groq_service
            
            image_data = arguments.get("image_data", "")
            image_filename = arguments.get("image_filename", "unknown.jpg")
            symptoms = arguments.get("symptoms", "")
            urgency_level = arguments.get("urgency_level", "routine")
            
            logger.info(f"Arguments received: filename={image_filename}, symptoms='{symptoms}', urgency={urgency_level}")
            logger.info(f"Image data length: {len(image_data) if image_data else 0}")
            
            if not image_data:
                return {
                    "content": [{
                        "type": "text",
                        "text": "Error: No image data provided for analysis"
                    }],
                    "isError": True
                }
            
            logger.info(f"MCP X-ray analysis started for {image_filename}")
            
            # Step 1: Body part detection and fracture analysis
            logger.info("Starting body part detection...")
            try:
                detection_result = await body_part_detector.detect_body_part_and_analyze(
                    image_data, image_filename
                )
                logger.info(f"Body part detection completed: {detection_result.get('body_part', 'unknown')}")
            except Exception as e:
                logger.error(f"Body part detection failed: {e}")
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Body part detection failed: {str(e)}\n\nThis could be due to:\n- Invalid image format\n- Missing model files\n- Service initialization issues\n\n⚠️ Please consult a healthcare professional for proper medical evaluation."
                    }],
                    "isError": True
                }
            
            # Step 2: Generate triage assessment via triage agent (rules-first, LLM fallback)
            from agents.triage import triage_agent
            triage_result = await triage_agent.process_triage_request(
                detections=detection_result['detections'],
                symptoms=symptoms,
                body_part=detection_result['body_part'],
                upstream_partial=False
            )
            
            # Step 3: Generate diagnosis summary using LLM with triage context
            diagnosis_result = await groq_service.generate_diagnosis_summary(
                triage_result=triage_result,
                detections=detection_result['detections'],
                symptoms=symptoms,
                body_part=detection_result['body_part']
            )
            
            # Format comprehensive response
            analysis_summary = f"""🔬 X-RAY ANALYSIS COMPLETE

📸 Image: {image_filename}
🦴 Body Part: {detection_result['body_part']}
🎯 Detection Confidence: {detection_result['confidence']:.1%}
🚨 Triage Level: {triage_result.get('level', 'UNKNOWN')}

🔍 FINDINGS:
{len(detection_result['detections'])} detection(s) found:
""" + "\n".join([f"- {det['label']}: {det['confidence']:.1%} confidence" for det in detection_result['detections']])

            analysis_summary += f"""

👤 PATIENT SUMMARY:
{diagnosis_result.get('summary', 'Analysis completed')}

📋 RECOMMENDATIONS:
""" + "\n".join([f"- {rec}" for rec in triage_result.get('recommendations', ['Consult healthcare professional'])])

            analysis_summary += f"""

⚠️ MEDICAL DISCLAIMER:
{triage_result.get('medical_disclaimer', 'This analysis is for educational purposes only. Always consult qualified medical professionals.')}
"""
            
            return {
                "content": [{
                    "type": "text",
                    "text": analysis_summary
                }],
                "isError": False
            }
            
        except Exception as e:
            logger.error(f"MCP X-ray analysis failed: {e}")
            return {
                "content": [{
                    "type": "text",
                    "text": f"X-ray analysis failed: {str(e)}\n\n⚠️ Please consult a healthcare professional for proper medical evaluation."
                }],
                "isError": True
            }
    
    async def _handle_generate_medical_summary(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle medical summary generation tool call."""
        try:
            from services.groq_service import groq_service
            
            triage_result = arguments.get("triage_result", {})
            detections = arguments.get("detections", [])
            symptoms = arguments.get("symptoms", "")
            body_part = arguments.get("body_part", "")
            
            if not triage_result:
                return {
                    "content": [{
                        "type": "text",
                        "text": "Error: No triage result provided for summary generation"
                    }],
                    "isError": True
                }
            
            logger.info("MCP medical summary generation started")
            
            # Generate comprehensive diagnosis summary
            diagnosis_result = await groq_service.generate_diagnosis_summary(
                triage_result=triage_result,
                detections=detections,
                symptoms=symptoms,
                body_part=body_part
            )
            
            # Format patient-friendly summary
            summary_text = f"""👤 MEDICAL SUMMARY

{diagnosis_result.get('summary', 'Medical analysis completed')}

🔍 WHAT THIS MEANS:
{diagnosis_result.get('what_this_means', 'Please consult with a healthcare professional for detailed interpretation.')}

📋 NEXT STEPS:
""" + "\n".join([f"- {step}" for step in diagnosis_result.get('next_steps', ['Consult healthcare professional'])])

            summary_text += f"""

⏰ TIMELINE:
{diagnosis_result.get('timeline', 'Follow up as recommended by healthcare provider')}

🚨 WHEN TO SEEK HELP:
{diagnosis_result.get('when_to_seek_help', 'Seek immediate medical attention if symptoms worsen')}

⚠️ MEDICAL DISCLAIMER:
{diagnosis_result.get('medical_disclaimer', 'This summary is for educational purposes only. Always consult qualified medical professionals.')}
"""
            
            return {
                "content": [{
                    "type": "text",
                    "text": summary_text
                }],
                "isError": False
            }
            
        except Exception as e:
            logger.error(f"MCP medical summary generation failed: {e}")
            return {
                "content": [{
                    "type": "text",
                    "text": f"Medical summary generation failed: {str(e)}\n\n⚠️ Please consult a healthcare professional for proper medical evaluation."
                }],
                "isError": True
            }


# Global server instance
mcp_server = OrthopedicMCPServer()