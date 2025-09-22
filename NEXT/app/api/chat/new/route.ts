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

// POST handler for creating new chat sessions
export async function POST(request: NextRequest) {
  try {
    // Call FastAPI to create new chat session
    const response = await callFastAPIEndpoint('/api/chat/new', null, 'POST');

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('New chat API error:', error);
    
    const errorResponse: ApiError = {
      error: error instanceof Error ? error.message : 'Failed to create new chat',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}