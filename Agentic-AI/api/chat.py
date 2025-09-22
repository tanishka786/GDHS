"""Chat API endpoints for OrthoAssist."""

import uuid
import base64
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse, StreamingResponse
from pathlib import Path
from loguru import logger

# Import schemas
from schemas.chat import (
    ChatMessage, ChatResponse, MessageType, ChatIntent, ChatAction,
    MCPToolRequest, MCPToolResponse, ChatSession, ChatHistoryResponse,
    ChatSuggestionsResponse, NewChatResponse, IntentDetectionResponse,
    QuickTriageRequest, SymptomAnalysisRequest, ChatAttachment
)
from schemas.base import PatientInfo, BaseResponse

# Import services and agents
from services.chat_manager import chat_session_manager
from services.mcp_tools import mcp_tool_handler
from agents.pdf_report import pdf_report_agent
from services.cloudinary_service import CloudinaryService
from agents.router import RouterAgent
from agents.hand import HandAgent
from agents.leg import LegAgent
from agents.diagnosis import DiagnosisAgent
from agents.triage import TriageAgent
from agents.hospitals import HospitalAgent

# Create router
router = APIRouter(prefix="/api", tags=["chat"])

# Initialize cloudinary service
cloudinary_service = CloudinaryService()


async def detect_user_intent(message: str, image_data: Optional[str] = None) -> ChatIntent:
    """Detect user intent from message content."""
    message_lower = message.lower()
    
    # Image analysis intent
    if image_data or any(keyword in message_lower for keyword in [
        "analyze", "x-ray", "xray", "fracture", "bone", "scan", "image", "upload"
    ]):
        return ChatIntent.XRAY_ANALYSIS
    
    # Symptom checking
    elif any(keyword in message_lower for keyword in [
        "pain", "hurt", "symptom", "feel", "ache", "sore", "swelling", "tender"
    ]):
        return ChatIntent.SYMPTOM_CHECK
    
    # Report generation
    elif any(keyword in message_lower for keyword in [
        "report", "pdf", "document", "download", "generate"
    ]):
        return ChatIntent.REPORT_GENERATION
    
    # Hospital search
    elif any(keyword in message_lower for keyword in [
        "hospital", "doctor", "specialist", "emergency", "clinic", "find"
    ]):
        return ChatIntent.HOSPITAL_SEARCH
    
    # Medical questions
    elif any(keyword in message_lower for keyword in [
        "what is", "how to", "treatment", "condition", "diagnosis", "explain"
    ]):
        return ChatIntent.MEDICAL_QUESTION
    
    # MCP tool calls
    elif any(keyword in message_lower for keyword in [
        "mcp:", "tool:", "call:", "execute:"
    ]):
        return ChatIntent.MCP_TOOL_CALL
    
    return ChatIntent.GENERAL_CONVERSATION


async def handle_xray_analysis(request: ChatMessage, chat_id: str) -> ChatResponse:
    """Handle X-ray image analysis requests."""
    try:
        if not request.image_data:
            return ChatResponse(
                message_type=MessageType.ERROR,
                content="❌ No X-ray image provided. Please upload an image for analysis.",
                chat_id=chat_id,
                actions=[ChatAction(type="upload_image", label="📤 Upload X-ray Image")]
            )
        
        # Decode base64 image
        try:
            image_data = base64.b64decode(request.image_data)
        except Exception as e:
            return ChatResponse(
                message_type=MessageType.ERROR,
                content="❌ Invalid image data. Please ensure the image is properly encoded.",
                chat_id=chat_id
            )
        
        # Initialize agents
        router_agent = RouterAgent()
        hand_agent = HandAgent()
        leg_agent = LegAgent()
        diagnosis_agent = DiagnosisAgent()
        triage_agent = TriageAgent()
        
        # Load models
        await router_agent.load_model()
        await hand_agent.load_model()
        await leg_agent.load_model()
        
        # First, check if user provided body part context in message
        message_lower = request.message.lower()
        context_body_part = None
        
        # Check for explicit body part mentions in the message
        if any(keyword in message_lower for keyword in ['hand', 'wrist', 'finger', 'thumb']):
            context_body_part = "hand"
            logger.info("Body part context detected from message: hand")
        elif any(keyword in message_lower for keyword in ['leg', 'ankle', 'foot', 'toe', 'knee', 'shin']):
            context_body_part = "leg"
            logger.info("Body part context detected from message: leg")
        
        # Determine body part using context, router, or fallback detection
        if context_body_part:
            # Use explicit context from user message
            body_part = context_body_part
            confidence = 0.95  # High confidence when user explicitly mentions body part
            logger.info(f"Using body part from message context: {body_part}")
        else:
            # Try router classification
            body_part_result = await router_agent.classify_body_part(image_data)
            router_body_part = body_part_result.get("body_part", "unknown")
            router_confidence = body_part_result.get("confidence", 0.0)
            
            # If router has high confidence, use its result
            if router_confidence >= 0.70 and router_body_part in ["hand", "leg"]:
                body_part = router_body_part
                confidence = router_confidence
                logger.info(f"Using router classification: {body_part} (confidence: {confidence:.3f})")
            else:
                # Fallback to aspect ratio analysis (same as analyze.py)
                logger.info("Router confidence too low, using aspect ratio fallback")
                from PIL import Image
                import io
                
                image = Image.open(io.BytesIO(image_data))
                width, height = image.size
                aspect_ratio = width / height
                
                # Determine body part based on aspect ratio (same logic as analyze.py)
                if aspect_ratio > 1.2:  # Wide image - likely hand
                    body_part = 'hand'
                    confidence = 0.75
                elif aspect_ratio < 0.8:  # Tall image - likely leg
                    body_part = 'leg'
                    confidence = 0.80
                else:  # Square-ish - default to hand
                    body_part = 'hand'
                    confidence = 0.60
                
                logger.info(f"Aspect ratio fallback: {body_part} (ratio: {aspect_ratio:.2f}, confidence: {confidence:.2f})")
        
        # Run appropriate analysis based on determined body part
        if body_part == "hand":
            analysis_result = await hand_agent.analyze(image_data)
        elif body_part == "leg":
            analysis_result = await leg_agent.analyze(image_data)
        else:
            # Should not happen with our logic, but safety fallback
            logger.warning(f"Unknown body part '{body_part}', defaulting to hand")
            body_part = "hand"
            analysis_result = await hand_agent.analyze(image_data)
        
        # Extract detections from analysis result
        detections = analysis_result.get("detections", [])
        
        # Generate diagnosis
        diagnosis = await diagnosis_agent.analyze(detections, request.message)
        
        # Perform triage
        triage_result = await triage_agent.assess(detections, diagnosis)
        
        # Upload images to Cloudinary (FIXED: same logic as /api/analyze)
        cloudinary_urls = {}
        
        # Upload original image
        original_upload = cloudinary_service.upload_original_image(
            image_data,
            "chat_image.jpg", 
            str(uuid.uuid4())
        )
        
        if original_upload:
            cloudinary_urls['original_image_url'] = original_upload['url']
            cloudinary_urls['original_image_public_id'] = original_upload['public_id']
            logger.info(f"Original image uploaded to Cloudinary: {original_upload['url']}")
        
        # Upload annotated image ONLY if it exists and is different from original
        if analysis_result.get('annotated_image_data'):
            annotated_upload = cloudinary_service.upload_annotated_image(
                analysis_result['annotated_image_data'],  # Use actual annotated image
                "chat_image.jpg",
                str(uuid.uuid4())
            )
            
            if annotated_upload:
                cloudinary_urls['annotated_image_url'] = annotated_upload['url']
                cloudinary_urls['annotated_image_public_id'] = annotated_upload['public_id']
                logger.info(f"Annotated image uploaded to Cloudinary: {annotated_upload['url']}")
            else:
                logger.warning("Failed to upload annotated image to Cloudinary")
        else:
            logger.warning("No annotated image data found in analysis result")
        
        # Compile analysis data (exclude binary data for JSON serialization)
        analysis_data = {
            "detections": detections,
            "diagnosis": diagnosis,
            "triage": triage_result,
            "body_part": body_part,
            "cloudinary_urls": cloudinary_urls,
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "inference_time_ms": analysis_result.get("inference_time_ms"),
            "detection_count": analysis_result.get("detection_count", len(detections))
        }
        
        # Store analysis in session
        chat_session_manager.set_current_analysis(chat_id, analysis_data)
        
        # Generate response message
        triage_level = triage_result.get("level", "AMBER")
        confidence = triage_result.get("confidence", 0.0)
        primary_finding = diagnosis.get("primary_finding", "No specific findings")
        
        # Add debug logging
        logger.info(f"Analysis completed - Detections: {len(detections)}, Primary finding: {primary_finding}, Confidence: {confidence}, Triage: {triage_level}")
        
        response_message = f"""🔍 **X-ray Analysis Complete**

I've analyzed your {body_part} X-ray and here are the findings:

• **Primary Finding**: {primary_finding}
• **Confidence**: {confidence*100:.0f}%
• **Triage Level**: {triage_level}
• **Body Part**: {body_part.title()}

**Recommendation**: {triage_result.get('recommendation', 'Consider medical evaluation if symptoms persist')}

The images have been processed and annotated with the detection results."""
        
        # Create suggested actions
        actions = [
            ChatAction(type="generate_report", label="📄 Generate Medical Report", priority=1),
            ChatAction(type="find_hospitals", label="🏥 Find Specialists Nearby", priority=2),
            ChatAction(type="ask_symptoms", label="💬 Add Symptom Information", priority=3),
            ChatAction(type="second_opinion", label="🔄 Request Second Analysis", priority=4)
        ]
        
        # Create images array with only valid URLs
        images = []
        if cloudinary_urls.get("original_image_url"):
            images.append(cloudinary_urls["original_image_url"])
        if cloudinary_urls.get("annotated_image_url"):
            images.append(cloudinary_urls["annotated_image_url"])
        
        logger.info(f"Chat response includes {len(images)} images: {[url[:80] + '...' for url in images]}")
        
        return ChatResponse(
            message_type=MessageType.ANALYSIS,
            content=response_message,
            data=analysis_data,
            actions=actions,
            images=images,
            chat_id=chat_id,
            intent=ChatIntent.XRAY_ANALYSIS,
            mcp_tools=mcp_tool_handler.get_available_tools("post_analysis")
        )
        
    except Exception as e:
        logger.error(f"X-ray analysis failed: {e}")
        return ChatResponse(
            message_type=MessageType.ERROR,
            content=f"❌ Failed to analyze X-ray: {str(e)}. Please try again or contact support.",
            chat_id=chat_id,
            actions=[ChatAction(type="retry_analysis", label="🔄 Try Again")]
        )


async def handle_symptom_analysis(request: ChatMessage, chat_id: str) -> ChatResponse:
    """Handle symptom analysis requests."""
    try:
        # Extract symptoms from message
        symptoms = request.message
        
        # Use MCP tool for symptom analysis
        result = await mcp_tool_handler.execute_tool("symptom_analysis", {
            "symptoms": symptoms,
            "body_part": "",  # Will be extracted from symptoms
            "age": None
        })
        
        if result["status"] == "success":
            analysis = result["result"]
            
            response_message = f"""💭 **Symptom Analysis**

Based on your symptoms: "{symptoms}"

**Possible Conditions:**"""
            
            for condition in analysis.get("possible_conditions", []):
                response_message += f"\n• {condition}"
            
            response_message += f"""

**Recommendations:**"""
            for rec in analysis.get("recommendations", []):
                response_message += f"\n• {rec}"
            
            actions = [
                ChatAction(type="upload_xray", label="📤 Upload X-ray for Analysis", priority=1),
                ChatAction(type="find_hospitals", label="🏥 Find Emergency Care", priority=2),
                ChatAction(type="more_symptoms", label="💬 Add More Symptoms", priority=3)
            ]
            
            return ChatResponse(
                message_type=MessageType.TEXT,
                content=response_message,
                data=analysis,
                actions=actions,
                chat_id=chat_id,
                intent=ChatIntent.SYMPTOM_CHECK
            )
        else:
            return ChatResponse(
                message_type=MessageType.ERROR,
                content="❌ Could not analyze symptoms. Please provide more specific information.",
                chat_id=chat_id
            )
            
    except Exception as e:
        logger.error(f"Symptom analysis failed: {e}")
        return ChatResponse(
            message_type=MessageType.ERROR,
            content="❌ Symptom analysis failed. Please try again.",
            chat_id=chat_id
        )


async def handle_report_generation(request: ChatMessage, chat_id: str) -> ChatResponse:
    """Handle PDF report generation requests."""
    try:
        # Get current analysis from session
        current_analysis = chat_session_manager.get_current_analysis(chat_id)
        
        if not current_analysis:
            return ChatResponse(
                message_type=MessageType.ERROR,
                content="❌ No analysis data available. Please upload and analyze an X-ray first.",
                chat_id=chat_id,
                actions=[ChatAction(type="upload_xray", label="📤 Upload X-ray Image")]
            )
        
        # Extract patient info from user input or use defaults
        patient_info = request.patient_info
        if not patient_info:
            patient_info = {
                "name": "Anonymous Patient",
                "age": "Unknown",
                "gender": "Unknown",
                "patient_id": f"P{chat_id[:6].upper()}"
            }
            
            # Try to extract name from message
            if "name:" in request.message.lower():
                parts = request.message.lower().split("name:")
                if len(parts) > 1:
                    patient_info["name"] = parts[1].split(",")[0].strip().title()
        
        # Generate PDF report
        pdf_bytes = pdf_report_agent.generate_report(
            analysis_data=current_analysis,
            patient_info=patient_info
        )
        
        # Save PDF and get download URL
        report_id = str(uuid.uuid4())
        report_filename = f"orthoassist_report_{report_id}.pdf"
        reports_dir = Path("reports")
        reports_dir.mkdir(exist_ok=True)
        
        report_path = reports_dir / report_filename
        with open(report_path, "wb") as f:
            f.write(pdf_bytes)
        
        report_url = f"/api/reports/{report_id}/download"
        
        response_message = f"""📄 **Medical Report Generated Successfully**

Your comprehensive orthopedic assessment report is ready for download.

**Report Details:**
• Patient: {patient_info.get('name', 'Anonymous')}
• Report ID: {report_id[:8].upper()}
• Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}
• Format: PDF (Professional Medical Document)

**Report Includes:**
✅ Complete analysis results
✅ AI detection findings  
✅ Triage assessment
✅ Clinical recommendations
✅ Images and annotations
✅ Medical disclaimers"""
        
        actions = [
            ChatAction(type="download_report", label="📥 Download PDF Report", priority=1),
            ChatAction(type="email_report", label="📧 Email Report", priority=2),
            ChatAction(type="new_analysis", label="🆕 Start New Analysis", priority=3)
        ]
        
        return ChatResponse(
            message_type=MessageType.REPORT,
            content=response_message,
            data={"report_id": report_id, "report_url": report_url},
            actions=actions,
            attachments=[ChatAttachment(
                type="pdf",
                name=report_filename,
                url=report_url,
                size=len(pdf_bytes),
                mime_type="application/pdf"
            )],
            chat_id=chat_id,
            intent=ChatIntent.REPORT_GENERATION
        )
        
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return ChatResponse(
            message_type=MessageType.ERROR,
            content=f"❌ Failed to generate report: {str(e)}",
            chat_id=chat_id
        )


async def handle_medical_question(request: ChatMessage, chat_id: str) -> ChatResponse:
    """Handle medical knowledge questions."""
    try:
        # Use MCP tool for orthopedic knowledge
        result = await mcp_tool_handler.execute_tool("orthopedic_knowledge", {
            "query": request.message
        })
        
        if result["status"] == "success":
            knowledge = result["result"]
            
            response_message = f"""📚 **Medical Knowledge**

**Question**: {knowledge['query']}

**Answer**: {knowledge['response']}

**References**: {', '.join(knowledge.get('references', []))}
**Confidence**: {knowledge.get('confidence', 0.8)*100:.0f}%"""
            
            actions = [
                ChatAction(type="ask_followup", label="❓ Ask Follow-up Question", priority=1),
                ChatAction(type="upload_xray", label="📤 Upload X-ray for Analysis", priority=2)
            ]
            
            return ChatResponse(
                message_type=MessageType.TEXT,
                content=response_message,
                data=knowledge,
                actions=actions,
                chat_id=chat_id,
                intent=ChatIntent.MEDICAL_QUESTION
            )
        else:
            return ChatResponse(
                message_type=MessageType.ERROR,
                content="❌ Could not find information about that topic. Please try rephrasing your question.",
                chat_id=chat_id
            )
            
    except Exception as e:
        logger.error(f"Medical question handling failed: {e}")
        return ChatResponse(
            message_type=MessageType.ERROR,
            content="❌ Failed to process medical question. Please try again.",
            chat_id=chat_id
        )


async def handle_general_conversation(request: ChatMessage, chat_id: str) -> ChatResponse:
    """Handle general conversation."""
    message_lower = request.message.lower()
    
    if any(greeting in message_lower for greeting in ["hello", "hi", "hey", "start"]):
        response_message = """👋 **Welcome to OrthoAssist!**

I'm your AI-powered orthopedic assistant. I can help you with:

🔍 **X-ray Analysis** - Upload X-ray images for fracture detection
💭 **Symptom Assessment** - Describe symptoms for preliminary evaluation  
📄 **Medical Reports** - Generate professional PDF reports
🏥 **Find Specialists** - Locate nearby orthopedic care
❓ **Medical Questions** - Ask about bones, fractures, and treatments

How can I assist you today?"""
        
        actions = [
            ChatAction(type="upload_xray", label="📤 Upload X-ray", priority=1),
            ChatAction(type="describe_symptoms", label="💬 Describe Symptoms", priority=2),
            ChatAction(type="ask_question", label="❓ Ask Medical Question", priority=3)
        ]
    else:
        response_message = """I'm here to help with orthopedic medical questions and X-ray analysis. 

You can:
• Upload an X-ray image for analysis
• Describe your symptoms for assessment
• Ask questions about bones and fractures
• Request medical reports

What would you like to do?"""
        
        actions = [
            ChatAction(type="upload_xray", label="📤 Upload X-ray", priority=1),
            ChatAction(type="describe_symptoms", label="💬 Describe Symptoms", priority=2)
        ]
    
    return ChatResponse(
        message_type=MessageType.TEXT,
        content=response_message,
        actions=actions,
        chat_id=chat_id,
        intent=ChatIntent.GENERAL_CONVERSATION,
        mcp_tools=mcp_tool_handler.get_available_tools("general")
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_interface(request: ChatMessage):
    """Main chat endpoint that handles user interactions and MCP tool calls."""
    try:
        # Generate chat_id if not provided
        chat_id = request.chat_id or str(uuid.uuid4())
        
        # Initialize chat session if new
        session = chat_session_manager.get_session(chat_id)
        if not session:
            chat_id = chat_session_manager.create_session()
        
        # Detect user intent
        intent = await detect_user_intent(request.message, request.image_data)
        
        # Route based on intent
        if intent == ChatIntent.XRAY_ANALYSIS:
            response = await handle_xray_analysis(request, chat_id)
        elif intent == ChatIntent.SYMPTOM_CHECK:
            response = await handle_symptom_analysis(request, chat_id)
        elif intent == ChatIntent.MEDICAL_QUESTION:
            response = await handle_medical_question(request, chat_id)
        elif intent == ChatIntent.REPORT_GENERATION:
            response = await handle_report_generation(request, chat_id)
        elif intent == ChatIntent.HOSPITAL_SEARCH:
            # Use MCP tool for hospital search
            result = await mcp_tool_handler.execute_tool("hospital_finder", {
                "location": request.message,
                "urgency_level": "AMBER",
                "specialty": "orthopedic"
            })
            response = ChatResponse(
                message_type=MessageType.TEXT,
                content=f"🏥 Hospital search results: {result['result']}",
                data=result,
                chat_id=chat_id,
                intent=intent
            )
        else:
            response = await handle_general_conversation(request, chat_id)
        
        # Save message to session
        chat_session_manager.save_message(
            chat_id=chat_id,
            user_message=request.message,
            bot_response=response.content,
            intent=intent.value,
            metadata={"has_image": bool(request.image_data)}
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Chat processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed: {str(e)}"
        )


@router.post("/chat/new", response_model=NewChatResponse)
async def create_new_chat():
    """Create new chat session."""
    try:
        chat_id = chat_session_manager.create_session()
        
        return NewChatResponse(
            success=True,
            message="New chat session created successfully",
            chat_id=chat_id,
            welcome_message="👋 Welcome to OrthoAssist! I'm here to help with X-ray analysis and orthopedic questions. How can I assist you today?",
            suggestions=[
                "🔍 Upload X-ray for analysis",
                "💬 Describe your symptoms",
                "❓ Ask about orthopedic conditions",
                "🏥 Find nearby specialists"
            ]
        )
        
    except Exception as e:
        logger.error(f"Failed to create new chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create new chat: {str(e)}"
        )


@router.get("/chat/{chat_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(chat_id: str, limit: Optional[int] = None):
    """Get chat conversation history."""
    try:
        session = chat_session_manager.get_session(chat_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
        
        messages = chat_session_manager.get_chat_history(chat_id, limit)
        
        return ChatHistoryResponse(
            success=True,
            message="Chat history retrieved successfully",
            chat_id=chat_id,
            messages=messages,
            context=session.context,
            total_messages=len(messages)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get chat history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get chat history: {str(e)}"
        )


@router.get("/chat/suggestions", response_model=ChatSuggestionsResponse)
async def get_chat_suggestions(context: Optional[str] = None):
    """Get contextual chat suggestions."""
    try:
        base_suggestions = [
            "🔍 Analyze my X-ray image",
            "💬 Check symptoms without X-ray", 
            "🏥 Find nearby orthopedic specialists",
            "📄 Generate medical report",
            "❓ Ask about fracture types"
        ]
        
        if context == "post_analysis":
            suggestions = [
                "📄 Generate detailed PDF report",
                "🏥 Find specialists for this condition",
                "💊 What treatments are available?",
                "🔄 Analyze another X-ray",
                "❓ Explain the diagnosis in detail"
            ]
        else:
            suggestions = base_suggestions
        
        return ChatSuggestionsResponse(
            success=True,
            message="Suggestions retrieved successfully",
            suggestions=suggestions,
            context=context
        )
        
    except Exception as e:
        logger.error(f"Failed to get suggestions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get suggestions: {str(e)}"
        )


@router.post("/chat/intent", response_model=IntentDetectionResponse)
async def detect_intent(message: str):
    """Detect user intent from chat message."""
    try:
        intent = await detect_user_intent(message)
        
        # Simple confidence scoring based on keyword matches
        confidence = 0.8 if intent != ChatIntent.GENERAL_CONVERSATION else 0.3
        
        return IntentDetectionResponse(
            success=True,
            message="Intent detected successfully",
            intent=intent,
            confidence=confidence,
            entities={}  # Could be enhanced with NER
        )
        
    except Exception as e:
        logger.error(f"Intent detection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Intent detection failed: {str(e)}"
        )


@router.post("/chat/{chat_id}/context")
async def update_chat_context(chat_id: str, context: Dict[str, Any]):
    """Update chat context for better responses."""
    try:
        success = chat_session_manager.update_session_context(chat_id, context)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
        
        return BaseResponse(
            success=True,
            message="Chat context updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update context: {str(e)}"
        )


@router.post("/triage/quick")
async def quick_triage(request: QuickTriageRequest):
    """Quick triage assessment for urgent cases."""
    try:
        # Decode image
        image_data = base64.b64decode(request.image_data)
        
        # Initialize triage agent
        triage_agent = TriageAgent()
        
        # Perform quick assessment
        assessment = await triage_agent.quick_assess(
            image_data=image_data,
            symptoms=request.symptoms,
            priority=request.priority
        )
        
        return {
            "success": True,
            "message": "Quick triage assessment completed",
            "assessment": assessment,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Quick triage failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quick triage failed: {str(e)}"
        )


@router.post("/analyze/symptoms")
async def analyze_symptoms(request: SymptomAnalysisRequest):
    """Analyze symptoms without X-ray image."""
    try:
        # Use MCP tool for symptom analysis
        result = await mcp_tool_handler.execute_tool("symptom_analysis", {
            "symptoms": request.symptoms,
            "body_part": request.body_part,
            "age": request.age
        })
        
        return {
            "success": True,
            "message": "Symptom analysis completed",
            "analysis": result["result"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Symptom analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Symptom analysis failed: {str(e)}"
        )


# MCP Tool endpoints
@router.post("/mcp/tools/{tool_name}", response_model=MCPToolResponse)
async def execute_mcp_tool(tool_name: str, request: MCPToolRequest):
    """Execute MCP tool via API."""
    try:
        result = await mcp_tool_handler.execute_tool(tool_name, request.parameters)
        
        return MCPToolResponse(
            success=True,
            message="MCP tool executed successfully",
            tool_name=tool_name,
            result=result.get("result", {}),
            status=result.get("status", "success"),
            chat_id=request.chat_id
        )
        
    except Exception as e:
        logger.error(f"MCP tool execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tool execution failed: {str(e)}"
        )


@router.get("/mcp/tools")
async def list_mcp_tools(context: Optional[str] = None):
    """List available MCP tools."""
    try:
        tools = mcp_tool_handler.get_available_tools(context or "general")
        
        return {
            "success": True,
            "message": "MCP tools retrieved successfully",
            "tools": [tool.dict() for tool in tools],
            "context": context,
            "count": len(tools)
        }
        
    except Exception as e:
        logger.error(f"Failed to list MCP tools: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list MCP tools: {str(e)}"
        )


# Report endpoints
@router.post("/reports/generate")
async def generate_pdf_report(
    analysis_data: Dict[str, Any],
    patient_info: Optional[Dict[str, Any]] = None
):
    """Generate comprehensive PDF medical report."""
    try:
        # Generate PDF report
        pdf_bytes = pdf_report_agent.generate_report(
            analysis_data=analysis_data,
            patient_info=patient_info
        )
        
        # Save PDF and get download URL
        report_id = str(uuid.uuid4())
        report_filename = f"orthoassist_report_{report_id}.pdf"
        reports_dir = Path("reports")
        reports_dir.mkdir(exist_ok=True)
        
        report_path = reports_dir / report_filename
        with open(report_path, "wb") as f:
            f.write(pdf_bytes)
        
        return {
            "success": True,
            "message": "PDF report generated successfully",
            "report_id": report_id,
            "download_url": f"/api/reports/{report_id}/download",
            "filename": report_filename,
            "size": len(pdf_bytes)
        }
        
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {str(e)}"
        )


@router.get("/reports/{report_id}/download")
async def download_report(report_id: str):
    """Download generated PDF report."""
    try:
        report_path = Path("reports") / f"orthoassist_report_{report_id}.pdf"
        
        if not report_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        return FileResponse(
            path=report_path,
            media_type="application/pdf",
            filename=f"orthoassist_report_{report_id}.pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report download failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Download failed: {str(e)}"
        )


@router.get("/reports/{report_id}/status")
async def get_report_status(report_id: str):
    """Check PDF generation status for async processing."""
    try:
        report_path = Path("reports") / f"orthoassist_report_{report_id}.pdf"
        
        if report_path.exists():
            return {
                "success": True,
                "status": "completed",
                "report_id": report_id,
                "download_url": f"/api/reports/{report_id}/download",
                "file_size": report_path.stat().st_size
            }
        else:
            return {
                "success": True,
                "status": "not_found",
                "report_id": report_id
            }
        
    except Exception as e:
        logger.error(f"Report status check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status check failed: {str(e)}"
        )