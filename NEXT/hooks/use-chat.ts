import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ChatUIMessage, 
  ChatState, 
  ChatResponse, 
  AnalysisData,
  ApiResponse 
} from '@/lib/types/chat';
import { OrthoAssistChatAPI, FileUtils, ErrorUtils } from '@/lib/api/chat';

export interface UseChatOptions {
  autoStartChat?: boolean;
  maxMessages?: number;
}

export interface UseChatReturn {
  // State
  messages: ChatUIMessage[];
  isLoading: boolean;
  error: string | null;
  chatId: string | null;
  currentAnalysis: AnalysisData | null;
  suggestions: string[];

  // Actions
  sendMessage: (message: string, userInfo?: any) => Promise<void>;
  sendMessageWithImage: (message: string, imageFile: File, userInfo?: any) => Promise<void>;
  startNewChat: () => Promise<void>;
  clearChat: () => void;
  retryLastMessage: () => Promise<void>;
  loadChatHistory: (chatId: string) => Promise<void>;
  executeMCPTool: (toolName: string, parameters: Record<string, any>) => Promise<any>;
  downloadReport: (reportId: string, filename?: string) => Promise<boolean>;

  // Utilities
  validateImageFile: (file: File) => { valid: boolean; error?: string };
  createImagePreview: (file: File) => string;
  cleanupImagePreview: (url: string) => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { autoStartChat = true, maxMessages = 50 } = options;
  
  // State
  const [state, setState] = useState<ChatState>({
    messages: [],
    chatId: null,
    isLoading: false,
    error: null,
    currentAnalysis: null,
    suggestions: []
  });

  // API instance
  const apiRef = useRef(new OrthoAssistChatAPI());
  const lastMessageRef = useRef<{ message: string; imageFile?: File; userInfo?: any } | null>(null);

  // Helper function to add message to state
  const addMessage = useCallback((message: ChatUIMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages.slice(-(maxMessages - 1)), message]
    }));
  }, [maxMessages]);

  // Helper function to update last message
  const updateLastMessage = useCallback((updates: Partial<ChatUIMessage>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map((msg, index) => 
        index === prev.messages.length - 1 ? { ...msg, ...updates } : msg
      )
    }));
  }, []);

  // Convert API response to UI message
  const convertToUIMessage = useCallback((response: ChatResponse): ChatUIMessage => {
    return {
      id: `bot-${Date.now()}`,
      type: 'bot',
      content: response.content,
      timestamp: response.timestamp,
      images: response.images,
      actions: response.actions,
      attachments: response.attachments,
      isLoading: false
    };
  }, []);

  // Start new chat
  const startNewChat = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiRef.current.startNewChat();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          chatId: result.data.chat_id,
          messages: [{
            id: `bot-welcome-${Date.now()}`,
            type: 'bot',
            content: result.data.welcome_message,
            timestamp: new Date().toISOString(),
            isLoading: false
          }],
          suggestions: result.data.suggestions,
          isLoading: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: ErrorUtils.getUserFriendlyMessage(result.error),
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to start chat session',
        isLoading: false
      }));
    }
  }, []);

  // Send text message
  const sendMessage = useCallback(async (message: string, userInfo?: any) => {
    if (!message.trim()) return;

    // Store for retry functionality
    lastMessageRef.current = { message, userInfo };

    // Add user message to UI
    const userMessage: ChatUIMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      isLoading: false
    };
    addMessage(userMessage);

    // Add loading bot message
    const loadingMessage: ChatUIMessage = {
      id: `bot-loading-${Date.now()}`,
      type: 'bot',
      content: 'Analyzing your message...',
      timestamp: new Date().toISOString(),
      isLoading: true
    };
    addMessage(loadingMessage);

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiRef.current.sendMessage(message, userInfo);
      
      if (result.success) {
        const botMessage = convertToUIMessage(result.data);
        
        // Update state
        setState(prev => ({
          ...prev,
          chatId: result.data.chat_id,
          currentAnalysis: result.data.data as AnalysisData || prev.currentAnalysis,
          isLoading: false,
          error: null
        }));

        // Replace loading message with actual response
        updateLastMessage(botMessage);
      } else {
        setState(prev => ({
          ...prev,
          error: ErrorUtils.getUserFriendlyMessage(result.error),
          isLoading: false
        }));
        
        updateLastMessage({
          content: `❌ ${ErrorUtils.getUserFriendlyMessage(result.error)}`,
          isLoading: false,
          error: result.error.error
        });
      }
    } catch (error) {
      const errorMessage = 'Failed to send message';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      
      updateLastMessage({
        content: `❌ ${errorMessage}`,
        isLoading: false,
        error: errorMessage
      });
    }
  }, [addMessage, updateLastMessage, convertToUIMessage]);

  // Send message with image
  const sendMessageWithImage = useCallback(async (
    message: string, 
    imageFile: File, 
    userInfo?: any
  ) => {
    if (!message.trim() && !imageFile) return;

    // Validate image file
    const validation = FileUtils.validateImageFile(imageFile);
    if (!validation.valid) {
      setState(prev => ({
        ...prev,
        error: validation.error || 'Invalid image file'
      }));
      return;
    }

    // Store for retry functionality
    lastMessageRef.current = { message, imageFile, userInfo };

    // Create image preview
    const imagePreview = FileUtils.createImagePreview(imageFile);

    // Add user message to UI
    const userMessage: ChatUIMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message || 'Uploaded image for analysis',
      timestamp: new Date().toISOString(),
      images: [imagePreview],
      isLoading: false
    };
    addMessage(userMessage);

    // Add loading bot message
    const loadingMessage: ChatUIMessage = {
      id: `bot-loading-${Date.now()}`,
      type: 'bot',
      content: 'Analyzing your X-ray image... This may take a moment.',
      timestamp: new Date().toISOString(),
      isLoading: true
    };
    addMessage(loadingMessage);

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiRef.current.sendMessageWithImage(message, imageFile, userInfo);
      
      if (result.success) {
        const botMessage = convertToUIMessage(result.data);
        
        // Update state
        setState(prev => ({
          ...prev,
          chatId: result.data.chat_id,
          currentAnalysis: result.data.data as AnalysisData || prev.currentAnalysis,
          isLoading: false,
          error: null
        }));

        // Replace loading message with actual response
        updateLastMessage(botMessage);
      } else {
        setState(prev => ({
          ...prev,
          error: ErrorUtils.getUserFriendlyMessage(result.error),
          isLoading: false
        }));
        
        updateLastMessage({
          content: `❌ ${ErrorUtils.getUserFriendlyMessage(result.error)}`,
          isLoading: false,
          error: result.error.error
        });
      }
    } catch (error) {
      const errorMessage = 'Failed to send message with image';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      
      updateLastMessage({
        content: `❌ ${errorMessage}`,
        isLoading: false,
        error: errorMessage
      });
    } finally {
      // Cleanup image preview
      FileUtils.cleanupImagePreview(imagePreview);
    }
  }, [addMessage, updateLastMessage, convertToUIMessage]);

  // Retry last message
  const retryLastMessage = useCallback(async () => {
    if (!lastMessageRef.current) return;

    const { message, imageFile, userInfo } = lastMessageRef.current;
    
    if (imageFile) {
      await sendMessageWithImage(message, imageFile, userInfo);
    } else {
      await sendMessage(message, userInfo);
    }
  }, [sendMessage, sendMessageWithImage]);

  // Execute MCP tool
  const executeMCPTool = useCallback(async (
    toolName: string, 
    parameters: Record<string, any>
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiRef.current.executeMCPTool(toolName, parameters);
      
      if (result.success) {
        setState(prev => ({ ...prev, isLoading: false, error: null }));
        return result.data;
      } else {
        setState(prev => ({
          ...prev,
          error: ErrorUtils.getUserFriendlyMessage(result.error),
          isLoading: false
        }));
        return null;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to execute MCP tool',
        isLoading: false
      }));
      return null;
    }
  }, []);

  // Load chat history
  const loadChatHistory = useCallback(async (chatId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiRef.current.getChatHistory(chatId);
      
      if (result.success) {
        // Convert history to UI messages
        const messages: ChatUIMessage[] = result.data.messages.map((msg: any, index: number) => [
          {
            id: `user-history-${index}`,
            type: 'user' as const,
            content: msg.user_message,
            timestamp: msg.timestamp,
            isLoading: false
          },
          {
            id: `bot-history-${index}`,
            type: 'bot' as const,
            content: msg.bot_response,
            timestamp: msg.timestamp,
            isLoading: false
          }
        ]).flat();

        setState(prev => ({
          ...prev,
          chatId,
          messages,
          context: result.data.context,
          currentAnalysis: result.data.context.current_analysis,
          isLoading: false,
          error: null
        }));

        apiRef.current.setChatId(chatId);
      } else {
        setState(prev => ({
          ...prev,
          error: ErrorUtils.getUserFriendlyMessage(result.error),
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load chat history',
        isLoading: false
      }));
    }
  }, []);

  // Clear chat
  const clearChat = useCallback(() => {
    setState({
      messages: [],
      chatId: null,
      isLoading: false,
      error: null,
      currentAnalysis: null,
      suggestions: []
    });
    apiRef.current.clearSession();
    lastMessageRef.current = null;
  }, []);

  // Download report
  const downloadReport = useCallback(async (reportId: string, filename?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const success = await apiRef.current.triggerReportDownload(reportId, filename);
      
      if (success) {
        setState(prev => ({ ...prev, isLoading: false, error: null }));
        
        // Add success message to chat
        const successMessage: ChatUIMessage = {
          id: `system-download-${Date.now()}`,
          type: 'bot',
          content: `✅ Report downloaded successfully! Check your downloads folder for: ${filename || `orthoassist_report_${reportId.slice(0, 8)}.pdf`}`,
          timestamp: new Date().toISOString(),
          isLoading: false
        };
        addMessage(successMessage);
        
        return true;
      } else {
        setState(prev => ({
          ...prev,
          error: 'Failed to download report',
          isLoading: false
        }));
        
        // Add error message to chat
        const errorMessage: ChatUIMessage = {
          id: `system-download-error-${Date.now()}`,
          type: 'bot',
          content: `❌ Failed to download report. Please try again or contact support.`,
          timestamp: new Date().toISOString(),
          isLoading: false
        };
        addMessage(errorMessage);
        
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Download failed',
        isLoading: false
      }));
      return false;
    }
  }, [addMessage]);

  // Auto-start chat on mount
  useEffect(() => {
    if (autoStartChat && !state.chatId && state.messages.length === 0) {
      startNewChat();
    }
  }, [autoStartChat, state.chatId, state.messages.length, startNewChat]);

  return {
    // State
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    chatId: state.chatId,
    currentAnalysis: state.currentAnalysis,
    suggestions: state.suggestions,

    // Actions
    sendMessage,
    sendMessageWithImage,
    startNewChat,
    clearChat,
    retryLastMessage,
    loadChatHistory,
    executeMCPTool,
    downloadReport,

    // Utilities
    validateImageFile: FileUtils.validateImageFile,
    createImagePreview: FileUtils.createImagePreview,
    cleanupImagePreview: FileUtils.cleanupImagePreview
  };
}