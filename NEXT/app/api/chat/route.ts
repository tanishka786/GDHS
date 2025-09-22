import {
  ApiError,
  ChatMessage,
  ChatResponse
} from '@/lib/types/chat';
import { NextRequest, NextResponse } from 'next/server';

// Environment variable for FastAPI backend URL
const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

// Helper function to convert File to base64
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return base64;
}

// Helper function to make requests to FastAPI backend
async function callFastAPIEndpoint(
  endpoint: string,
  data: any,
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

// Main POST handler for chat messages
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    let chatData: ChatMessage;

    // Handle both JSON and FormData requests
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      chatData = {
        message: formData.get('message') as string,
        chat_id: formData.get('chat_id') as string || undefined,
        user_info: formData.get('user_info') 
          ? JSON.parse(formData.get('user_info') as string)
          : undefined,
        mcp_context: formData.get('mcp_context')
          ? JSON.parse(formData.get('mcp_context') as string)
          : undefined,
      };

      // Handle image file
      const imageFile = formData.get('image') as File;
      if (imageFile && imageFile.size > 0) {
        chatData.image_data = await fileToBase64(imageFile);
      }
    } else {
      // Handle JSON request
      const body = await request.json();
      chatData = body;
    }

    // Validate required fields
    if (!chatData.message || chatData.message.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Message is required',
          timestamp: new Date().toISOString()
        } as ApiError,
        { status: 400 }
      );
    }

    // Send request to FastAPI backend
    console.log('Sending request to FastAPI backend:', {
      endpoint: '/api/chat',
      hasImage: !!chatData.image_data,
      message: chatData.message,
      fastApiUrl: FASTAPI_BASE_URL
    });
    
    const response: ChatResponse = await callFastAPIEndpoint('/api/chat', chatData);
    
    console.log('Received response from backend:', {
      hasImages: !!response.images,
      imageCount: response.images?.length,
      messageType: response.message_type,
      contentLength: response.content?.length,
      imageUrls: response.images?.map((url, idx) => ({
        index: idx,
        type: idx === 0 ? 'original' : 'annotated',
        url: url?.substring(0, 80) + '...'
      })),
      dataKeys: response.data ? Object.keys(response.data) : [],
      detectionCount: response.data?.detection_count,
      cloudinaryUrls: response.data?.cloudinary_urls
    });

    // Defensive: Ensure proper Cloudinary URLs and avoid duplicate images
    if (response.data?.cloudinary_urls) {
      const originalUrl = response.data.cloudinary_urls.original_image_url;
      const annotatedUrl = response.data.cloudinary_urls.annotated_image_url;
      
      // Validate we have proper Cloudinary URLs
      if (originalUrl && annotatedUrl && originalUrl !== annotatedUrl) {
        // Use verified Cloudinary URLs
        response.images = [originalUrl, annotatedUrl];
        console.log('Using verified Cloudinary URLs:', {
          original: originalUrl.substring(0, 80) + '...',
          annotated: annotatedUrl.substring(0, 80) + '...'
        });
      } else if (originalUrl) {
        // Only return original if annotated is missing or duplicate
        response.images = [originalUrl];
        console.warn('Annotated image missing or duplicate, only showing original');
      } else {
        console.error('No valid Cloudinary URLs found');
      }
    }

    // Return successful response
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Chat API error:', error);
    
    const errorResponse: ApiError = {
      error: error instanceof Error ? error.message : 'Internal server error',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// GET handler for chat suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context');

    const response = await callFastAPIEndpoint(
      `/api/chat/suggestions${context ? `?context=${context}` : ''}`,
      null,
      'GET'
    );

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Chat suggestions API error:', error);
    
    const errorResponse: ApiError = {
      error: error instanceof Error ? error.message : 'Failed to get suggestions',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}