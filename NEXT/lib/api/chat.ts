import { 
  ChatMessage, 
  ChatResponse, 
  ChatSuggestions, 
  MCPToolRequest, 
  MCPToolResponse, 
  ApiResponse,
  ApiError 
} from '@/lib/types/chat';

/**
 * OrthoAssist Chat API Client
 * Handles all communication with the chat backend endpoints
 */
export class OrthoAssistChatAPI {
  private baseUrl: string;
  private chatId: string | null = null;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Start a new chat session
   */
  async startNewChat(): Promise<ApiResponse<{ chat_id: string; welcome_message: string; suggestions: string[] }>> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        return { success: false, error };
      }

      const data = await response.json();
      this.chatId = data.chat_id;
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          error: error instanceof Error ? error.message : 'Failed to start new chat',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Send a text message to the chat
   */
  async sendMessage(message: string, userInfo?: any): Promise<ApiResponse<ChatResponse>> {
    return this.sendChatRequest({
      message,
      chat_id: this.chatId || undefined,
      user_info: userInfo
    });
  }

  /**
   * Send a message with an image file
   */
  async sendMessageWithImage(
    message: string, 
    imageFile: File, 
    userInfo?: any
  ): Promise<ApiResponse<ChatResponse>> {
    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('image', imageFile);
      
      if (this.chatId) {
        formData.append('chat_id', this.chatId);
      }
      
      if (userInfo) {
        formData.append('user_info', JSON.stringify(userInfo));
      }

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        return { success: false, error };
      }

      const data: ChatResponse = await response.json();
      this.chatId = data.chat_id;
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          error: error instanceof Error ? error.message : 'Failed to send message with image',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Send a message with base64 encoded image
   */
  async sendMessageWithBase64Image(
    message: string, 
    base64Image: string, 
    userInfo?: any
  ): Promise<ApiResponse<ChatResponse>> {
    return this.sendChatRequest({
      message,
      image_data: base64Image,
      chat_id: this.chatId || undefined,
      user_info: userInfo
    });
  }

  /**
   * Send a raw chat request
   */
  private async sendChatRequest(chatData: ChatMessage): Promise<ApiResponse<ChatResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatData),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        return { success: false, error };
      }

      const data: ChatResponse = await response.json();
      this.chatId = data.chat_id;
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          error: error instanceof Error ? error.message : 'Failed to send chat request',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get chat suggestions
   */
  async getChatSuggestions(context?: string): Promise<ApiResponse<ChatSuggestions>> {
    try {
      const url = context 
        ? `${this.baseUrl}/chat?context=${encodeURIComponent(context)}`
        : `${this.baseUrl}/chat`;

      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        return { success: false, error };
      }

      const data: ChatSuggestions = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          error: error instanceof Error ? error.message : 'Failed to get chat suggestions',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(chatId?: string): Promise<ApiResponse<any>> {
    const targetChatId = chatId || this.chatId;
    
    if (!targetChatId) {
      return {
        success: false,
        error: {
          error: 'No chat ID available',
          timestamp: new Date().toISOString()
        }
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/${targetChatId}/history`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        return { success: false, error };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          error: error instanceof Error ? error.message : 'Failed to get chat history',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Execute MCP tool
   */
  async executeMCPTool(
    toolName: string, 
    parameters: Record<string, any>
  ): Promise<ApiResponse<MCPToolResponse>> {
    try {
      const requestData: Omit<MCPToolRequest, 'tool_name'> = {
        parameters,
        chat_id: this.chatId || undefined
      };

      const response = await fetch(`${this.baseUrl}/mcp/tools/${toolName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        return { success: false, error };
      }

      const data: MCPToolResponse = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          error: error instanceof Error ? error.message : 'Failed to execute MCP tool',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get current chat ID
   */
  getChatId(): string | null {
    return this.chatId;
  }

  /**
   * Set chat ID manually
   */
  setChatId(chatId: string): void {
    this.chatId = chatId;
  }

  /**
   * Clear current chat session
   */
  clearSession(): void {
    this.chatId = null;
  }

  /**
   * Download PDF report
   */
  async downloadReport(reportId: string): Promise<ApiResponse<Blob>> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${reportId}/download`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date().toISOString()
        }));
        return { success: false, error };
      }

      const blob = await response.blob();
      return { success: true, data: blob };
    } catch (error) {
      return {
        success: false,
        error: {
          error: error instanceof Error ? error.message : 'Failed to download report',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Trigger browser download for PDF report
   */
  async triggerReportDownload(reportId: string, filename?: string): Promise<boolean> {
    try {
      const result = await this.downloadReport(reportId);
      
      if (!result.success) {
        console.error('Download failed:', result.error);
        return false;
      }

      // Create download link
      const url = URL.createObjectURL(result.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `orthoassist_report_${reportId.slice(0, 8)}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Download trigger failed:', error);
      return false;
    }
  }
}

/**
 * Utility functions for file handling
 */
class FileUtils {
  /**
   * Convert File to base64 string
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Validate image file
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    // Check supported formats
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type)) {
      return { valid: false, error: 'Supported formats: JPEG, PNG, WebP' };
    }

    return { valid: true };
  }

  /**
   * Create image preview URL
   */
  static createImagePreview(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Cleanup image preview URL
   */
  static cleanupImagePreview(url: string): void {
    URL.revokeObjectURL(url);
  }
}

/**
 * Error handling utilities
 */
class ErrorUtils {
  /**
   * Check if error is network related
   */
  static isNetworkError(error: any): boolean {
    return error instanceof TypeError && error.message.includes('fetch');
  }

  /**
   * Check if error is timeout related
   */
  static isTimeoutError(error: any): boolean {
    return error instanceof Error && error.message.includes('timeout');
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: ApiError): string {
    if (error.error.includes('network') || this.isNetworkError(error.error)) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (error.error.includes('timeout') || this.isTimeoutError(error.error)) {
      return 'Request timed out. Please try again.';
    }
    
    if (error.error.includes('404')) {
      return 'Chat session not found. Please start a new chat.';
    }
    
    if (error.error.includes('500')) {
      return 'Server error. Please try again later.';
    }
    
    return error.error || 'An unexpected error occurred.';
  }
}

// Export a default instance for convenience
export const chatAPI = new OrthoAssistChatAPI();

// Export all utilities
export { OrthoAssistChatAPI as default, FileUtils, ErrorUtils };