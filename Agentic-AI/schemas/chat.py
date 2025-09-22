"""Chat interface schemas for OrthoAssist."""

from datetime import datetime
from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field
from enum import Enum

from schemas.base import BaseResponse, PatientInfo


class MessageType(str, Enum):
    """Types of chat messages."""
    TEXT = "text"
    ANALYSIS = "analysis"
    REPORT = "report"
    IMAGE = "image"
    ERROR = "error"
    MCP_TOOL_RESULT = "mcp_tool_result"
    SYSTEM = "system"


class ChatIntent(str, Enum):
    """User intent classification."""
    XRAY_ANALYSIS = "xray_analysis"
    SYMPTOM_CHECK = "symptom_check"
    MEDICAL_QUESTION = "medical_question"
    REPORT_GENERATION = "report_generation"
    HOSPITAL_SEARCH = "hospital_search"
    MCP_TOOL_CALL = "mcp_tool_call"
    GENERAL_CONVERSATION = "general_conversation"


class ChatAction(BaseModel):
    """Suggested action button."""
    type: str = Field(..., description="Action type identifier")
    label: str = Field(..., description="Display text for the action")
    icon: Optional[str] = Field(None, description="Icon identifier")
    priority: int = Field(default=1, description="Action priority (1=high, 5=low)")


class ChatAttachment(BaseModel):
    """File attachment in chat."""
    type: str = Field(..., description="Attachment type (pdf, image, etc.)")
    name: str = Field(..., description="Filename")
    url: str = Field(..., description="Download URL")
    size: Optional[int] = Field(None, description="File size in bytes")
    mime_type: Optional[str] = Field(None, description="MIME type")


class MCPToolDefinition(BaseModel):
    """MCP tool definition."""
    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")
    parameters: Dict[str, Any] = Field(..., description="Tool parameters schema")


class ChatMessage(BaseModel):
    """Chat message request."""
    message: str = Field(..., description="User message text")
    image_data: Optional[str] = Field(None, description="Base64 encoded image")
    chat_id: Optional[str] = Field(None, description="Chat session ID")
    user_info: Optional[Dict[str, Any]] = Field(None, description="User information")
    mcp_context: Optional[Dict[str, Any]] = Field(None, description="MCP context data")
    patient_info: Optional[PatientInfo] = Field(None, description="Patient information")
    timestamp: Optional[str] = Field(None, description="Message timestamp")


class ChatResponse(BaseResponse):
    """Chat response."""
    message_type: MessageType = Field(..., description="Type of response message")
    content: str = Field(..., description="Response message content")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional structured data")
    actions: Optional[List[ChatAction]] = Field(None, description="Suggested actions")
    images: Optional[List[str]] = Field(None, description="Image URLs")
    attachments: Optional[List[ChatAttachment]] = Field(None, description="File attachments")
    mcp_tools: Optional[List[MCPToolDefinition]] = Field(None, description="Available MCP tools")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Response timestamp")
    chat_id: str = Field(..., description="Chat session ID")
    intent: Optional[ChatIntent] = Field(None, description="Detected user intent")


class MCPToolRequest(BaseModel):
    """MCP tool execution request."""
    tool_name: str = Field(..., description="Name of the tool to execute")
    parameters: Dict[str, Any] = Field(..., description="Tool parameters")
    chat_id: Optional[str] = Field(None, description="Chat session ID")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class MCPToolResponse(BaseResponse):
    """MCP tool execution response."""
    tool_name: str = Field(..., description="Executed tool name")
    result: Dict[str, Any] = Field(..., description="Tool execution result")
    status: str = Field(..., description="Execution status")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    chat_id: Optional[str] = Field(None, description="Chat session ID")


class ChatSession(BaseModel):
    """Chat session data."""
    chat_id: str = Field(..., description="Unique session identifier")
    messages: List[Dict[str, Any]] = Field(default_factory=list, description="Chat history")
    context: Dict[str, Any] = Field(default_factory=dict, description="Session context")
    current_analysis: Optional[Dict[str, Any]] = Field(None, description="Current analysis data")
    patient_info: Optional[PatientInfo] = Field(None, description="Patient information")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class ChatHistoryResponse(BaseResponse):
    """Chat history response."""
    chat_id: str = Field(..., description="Chat session ID")
    messages: List[Dict[str, Any]] = Field(..., description="Chat message history")
    context: Dict[str, Any] = Field(..., description="Session context")
    total_messages: int = Field(..., description="Total number of messages")


class ChatSuggestionsResponse(BaseResponse):
    """Chat suggestions response."""
    suggestions: List[str] = Field(..., description="Suggested messages/actions")
    context: Optional[str] = Field(None, description="Context for suggestions")


class NewChatResponse(BaseResponse):
    """New chat session response."""
    chat_id: str = Field(..., description="New chat session ID")
    welcome_message: str = Field(..., description="Welcome message")
    suggestions: List[str] = Field(..., description="Initial suggestions")


class IntentDetectionResponse(BaseResponse):
    """Intent detection response."""
    intent: ChatIntent = Field(..., description="Detected intent")
    confidence: float = Field(..., description="Confidence score (0-1)")
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted entities")


class QuickTriageRequest(BaseModel):
    """Quick triage request."""
    image_data: str = Field(..., description="Base64 encoded X-ray image")
    symptoms: Optional[str] = Field(None, description="Patient symptoms")
    priority: bool = Field(default=False, description="High priority assessment")


class SymptomAnalysisRequest(BaseModel):
    """Symptom analysis request."""
    symptoms: str = Field(..., description="Patient symptoms description")
    body_part: Optional[str] = Field(None, description="Affected body part")
    age: Optional[int] = Field(None, description="Patient age")
    gender: Optional[str] = Field(None, description="Patient gender")
    duration: Optional[str] = Field(None, description="Symptom duration")