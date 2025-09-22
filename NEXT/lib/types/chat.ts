// Chat API Types for OrthoAssist Frontend

export interface UserInfo {
  name?: string;
  age?: string;
  gender?: string;
  patient_id?: string;
  phone?: string;
  email?: string;
}

export interface MCPContext {
  tool_name?: string;
  parameters?: Record<string, any>;
  context?: string;
  session_data?: Record<string, any>;
}

export interface ChatMessage {
  message: string;
  image_data?: string; // base64 encoded
  chat_id?: string;
  user_info?: UserInfo;
  mcp_context?: MCPContext;
}

export interface ChatAction {
  type: string;
  label: string;
  data?: {
    report_id?: string;
    filename?: string;
    url?: string;
    [key: string]: any;
  };
}

export interface ChatAttachment {
  type: string;
  name: string;
  url: string;
  size?: number;
  mime_type?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AnalysisData {
  detections?: Record<string, any>;
  diagnosis?: Record<string, any>;
  triage?: {
    level: 'GREEN' | 'AMBER' | 'RED';
    confidence: number;
    recommendation: string;
    urgency_score?: number;
  };
  cloudinary_urls?: {
    original_image_url?: string;
    annotated_image_url?: string;
  };
  request_id?: string;
  body_part?: string;
  findings?: string[];
}

export interface ChatResponse {
  message_type: 'text' | 'analysis' | 'report' | 'image' | 'mcp_tool_result' | 'error';
  content: string;
  data?: AnalysisData | Record<string, any>;
  actions?: ChatAction[];
  images?: string[];
  attachments?: ChatAttachment[];
  mcp_tools?: MCPTool[];
  timestamp: string;
  chat_id: string;
}

export interface ApiError {
  error: string;
  details?: string;
  timestamp: string;
  code?: string;
}

export interface ChatSession {
  chat_id: string;
  messages: ChatHistoryMessage[];
  context: Record<string, any>;
  current_analysis?: AnalysisData;
  created_at: string;
  updated_at?: string;
}

export interface ChatHistoryMessage {
  user_message: string;
  bot_response: string;
  timestamp: string;
  intent: string;
  message_type?: string;
  images?: string[];
  attachments?: ChatAttachment[];
}

export interface ChatSuggestions {
  suggestions: string[];
  context?: string;
}

export interface MCPToolRequest {
  tool_name: string;
  parameters: Record<string, any>;
  chat_id?: string;
}

export interface MCPToolResponse {
  tool_execution: {
    tool: string;
    result: any;
    status: 'success' | 'error';
    error?: string;
  };
  timestamp: string;
  chat_id?: string;
}

// Frontend-specific types
export interface ChatUIMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
  images?: string[];
  actions?: ChatAction[];
  attachments?: ChatAttachment[];
  isLoading?: boolean;
  error?: string;
}

export interface ChatState {
  messages: ChatUIMessage[];
  chatId: string | null;
  isLoading: boolean;
  error: string | null;
  currentAnalysis: AnalysisData | null;
  suggestions: string[];
}

// API Response wrappers
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: ApiError;
};

// File upload types
export interface ImageUpload {
  file: File;
  preview: string;
  isUploading: boolean;
  error?: string;
}

// Constants for message types and actions
export const MESSAGE_TYPES = {
  TEXT: 'text',
  ANALYSIS: 'analysis',
  REPORT: 'report',
  IMAGE: 'image',
  MCP_TOOL_RESULT: 'mcp_tool_result',
  ERROR: 'error'
} as const;

export const ACTION_TYPES = {
  GENERATE_REPORT: 'generate_report',
  FIND_HOSPITALS: 'find_hospitals',
  ASK_SYMPTOMS: 'ask_symptoms',
  SECOND_OPINION: 'second_opinion',
  DOWNLOAD_REPORT: 'download_report',
  EMAIL_REPORT: 'email_report',
  SHARE_REPORT: 'share_report',
  NEW_ANALYSIS: 'new_analysis',
  UPLOAD_XRAY: 'upload_xray'
} as const;

export const TRIAGE_LEVELS = {
  GREEN: 'GREEN',
  AMBER: 'AMBER',
  RED: 'RED'
} as const;