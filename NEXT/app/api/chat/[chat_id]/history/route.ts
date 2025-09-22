import { NextRequest, NextResponse } from 'next/server';
import { ChatSession, ApiError } from '@/lib/types/chat';

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

// Helper function to make requests to FastAPI backend
async function callFastAPIEndpoint(
  endpoint: string,
  data?: any,
  method: string = 'POST'
): Promise<any> {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: method === 'GET' ? undefined : JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`FastAPI request failed:`, error);
    throw error;
  }
}

// GET handler for retrieving chat history
export async function GET(
  request: NextRequest,
  { params }: { params: { chat_id: string } }
) {
  try {
    const chatId = params.chat_id;

    if (!chatId) {
      return NextResponse.json(
        { 
          error: 'Chat ID is required',
          timestamp: new Date().toISOString()
        } as ApiError,
        { status: 400 }
      );
    }

    // Call FastAPI to get chat history
    const response = await callFastAPIEndpoint(
      `/api/chat/${chatId}/history`,
      null,
      'GET'
    );

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Chat history API error:', error);
    
    const errorResponse: ApiError = {
      error: error instanceof Error ? error.message : 'Failed to retrieve chat history',
      timestamp: new Date().toISOString()
    };

    // Handle 404 specifically for chat not found
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    
    return NextResponse.json(errorResponse, { status });
  }
}