import {import {

  ApiError,  ApiError,

  ChatMessage,  ChatMessage,

  ChatResponse  ChatResponse

} from '@/lib/types/chat';} from '@/lib/types/chat';

import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';



// Environment variable for FastAPI backend URL// Environment variable for FastAPI backend URL

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';



// Helper function to convert File to base64// Helper function to convert File to base64

async function fileToBase64(file: File): Promise<string> {async function fileToBase64(file: File): Promise<string> {

  const buffer = await file.arrayBuffer();  const buffer = await file.arrayBuffer();

  const base64 = Buffer.from(buffer).toString('base64');  const base64 = Buffer.from(buffer).toString('base64');

  return base64;  return base64;

}}



// Helper function to make requests to FastAPI backend// Helper function to make requests to FastAPI backend

async function callFastAPIEndpoint(async function callFastAPIEndpoint(

  endpoint: string,  endpoint: string,

  data: any,  data: any,

  method: string = 'POST'  method: string = 'POST'

): Promise<any> {): Promise<any> {

  try {  try {

    const response = await fetch(`${FASTAPI_BASE_URL}${endpoint}`, {    const response = await fetch(`${FASTAPI_BASE_URL}${endpoint}`, {

      method,      method,

      headers: {      headers: {

        'Content-Type': 'application/json',        'Content-Type': 'application/json',

        'Accept': 'application/json',        'Accept': 'application/json',

      },      },

      body: method === 'GET' ? undefined : JSON.stringify(data),      body: method === 'GET' ? undefined : JSON.stringify(data),

    });    });



    if (!response.ok) {    if (!response.ok) {

      const errorData = await response.json().catch(() => ({      const errorData = await response.json().catch(() => ({

        detail: `HTTP ${response.status}: ${response.statusText}`        detail: `HTTP ${response.status}: ${response.statusText}`

      }));      }));

      throw new Error(errorData.detail || `Request failed with status ${response.status}`);      throw new Error(errorData.detail || `Request failed with status ${response.status}`);

    }    }



    return await response.json();    return await response.json();

  } catch (error) {  } catch (error) {

    console.error(`FastAPI request failed:`, error);    console.error(`FastAPI request failed:`, error);

    throw error;    throw error;

  }  }

}}



// Main POST handler for chat messages// Main POST handler for chat messages

export async function POST(request: NextRequest) {export async function POST(request: NextRequest) {

  try {  try {

    const contentType = request.headers.get('content-type');    const contentType = request.headers.get('content-type');

    let chatData: ChatMessage;    let chatData: ChatMessage;



    // Handle both JSON and FormData requests    // Handle both JSON and FormData requests

    if (contentType?.includes('multipart/form-data')) {    if (contentType?.includes('multipart/form-data')) {

      const formData = await request.formData();      const formData = await request.formData();

            

      chatData = {      chatData = {

        message: formData.get('message') as string,        message: formData.get('message') as string,

        chat_id: formData.get('chat_id') as string || undefined,        chat_id: formData.get('chat_id') as string || undefined,

        user_info: formData.get('user_info')         user_info: formData.get('user_info') 

          ? JSON.parse(formData.get('user_info') as string)          ? JSON.parse(formData.get('user_info') as string)

          : undefined,          : undefined,

        mcp_context: formData.get('mcp_context')        mcp_context: formData.get('mcp_context')

          ? JSON.parse(formData.get('mcp_context') as string)          ? JSON.parse(formData.get('mcp_context') as string)

          : undefined,          : undefined,

      };      };



      // Handle image file      // Handle image file

      const imageFile = formData.get('image') as File;      const imageFile = formData.get('image') as File;

      if (imageFile && imageFile.size > 0) {      if (imageFile && imageFile.size > 0) {

        chatData.image_data = await fileToBase64(imageFile);        chatData.image_data = await fileToBase64(imageFile);

      }      }

    } else {    } else {

      // Handle JSON request      // Handle JSON request

      const body = await request.json();      const body = await request.json();

      chatData = body;      chatData = body;

    }    }



    // Validate required fields    // Validate required fields

    if (!chatData.message || chatData.message.trim() === '') {    if (!chatData.message || chatData.message.trim() === '') {

      return NextResponse.json(      return NextResponse.json(

        {         { 

          error: 'Message is required',          error: 'Message is required',

          timestamp: new Date().toISOString()          timestamp: new Date().toISOString()

        } as ApiError,        } as ApiError,

        { status: 400 }        { status: 400 }

      );      );

    }    }



    // Send request to FastAPI backend    // Send request to FastAPI backend

    console.log('Sending request to FastAPI backend:', {    console.log('Sending request to FastAPI backend:', {

      endpoint: '/api/chat',      endpoint: '/api/chat',

      hasImage: !!chatData.image_data,      hasImage: !!chatData.image_data,

      message: chatData.message,      message: chatData.message,

      fastApiUrl: FASTAPI_BASE_URL      fastApiUrl: FASTAPI_BASE_URL

    });    });

        

    const response: ChatResponse = await callFastAPIEndpoint('/api/chat', chatData);    const response: ChatResponse = await callFastAPIEndpoint('/api/chat', chatData);

        

    console.log('Received response from backend:', {    console.log('Received response from backend:', {

      hasImages: !!response.images,      hasImages: !!response.images,

      imageCount: response.images?.length,      imageCount: response.images?.length,

      messageType: response.message_type,      messageType: response.message_type,

      contentLength: response.content?.length,      contentLength: response.content?.length,

      imageUrls: response.images?.map((url, idx) => ({      imageUrls: response.images?.map((url, idx) => ({

        index: idx,        index: idx,

        type: idx === 0 ? 'original' : 'annotated',        type: idx === 0 ? 'original' : 'annotated',

        url: url?.substring(0, 80) + '...'        url: url?.substring(0, 80) + '...'

      })),      })),

      dataKeys: response.data ? Object.keys(response.data) : [],      dataKeys: response.data ? Object.keys(response.data) : [],

      detectionCount: response.data?.detection_count,      detectionCount: response.data?.detection_count,

      cloudinaryUrls: response.data?.cloudinary_urls      cloudinaryUrls: response.data?.cloudinary_urls

    });    });



    // Defensive: Ensure proper Cloudinary URLs and avoid duplicate images    // Return successful response

    if (response.data?.cloudinary_urls) {    return NextResponse.json(response, { status: 200 });

      const originalUrl = response.data.cloudinary_urls.original_image_url;

      const annotatedUrl = response.data.cloudinary_urls.annotated_image_url;  } catch (error) {

          console.error('Chat API error:', error);

      // Validate we have proper Cloudinary URLs    

      if (originalUrl && annotatedUrl && originalUrl !== annotatedUrl) {    const errorResponse: ApiError = {

        // Use verified Cloudinary URLs      error: error instanceof Error ? error.message : 'Internal server error',

        response.images = [originalUrl, annotatedUrl];      details: error instanceof Error ? error.stack : undefined,

        console.log('Using verified Cloudinary URLs:', {      timestamp: new Date().toISOString()

          original: originalUrl.substring(0, 80) + '...',    };

          annotated: annotatedUrl.substring(0, 80) + '...'

        });    return NextResponse.json(errorResponse, { status: 500 });

      } else if (originalUrl) {  }

        // Only return original if annotated is missing or duplicate}

        response.images = [originalUrl];

        console.warn('Annotated image missing or duplicate, only showing original');// GET handler for chat suggestions

      } else {export async function GET(request: NextRequest) {

        console.error('No valid Cloudinary URLs found');  try {

      }    const { searchParams } = new URL(request.url);

    }    const context = searchParams.get('context');



    // Return successful response    const response = await callFastAPIEndpoint(

    return NextResponse.json(response, { status: 200 });      `/api/chat/suggestions${context ? `?context=${context}` : ''}`,

      null,

  } catch (error) {      'GET'

    console.error('Chat API error:', error);    );

    

    const errorResponse: ApiError = {    return NextResponse.json(response, { status: 200 });

      error: error instanceof Error ? error.message : 'Internal server error',

      details: error instanceof Error ? error.stack : undefined,  } catch (error) {

      timestamp: new Date().toISOString()    console.error('Chat suggestions API error:', error);

    };    

    const errorResponse: ApiError = {

    return NextResponse.json(errorResponse, { status: 500 });      error: error instanceof Error ? error.message : 'Failed to get suggestions',

  }      timestamp: new Date().toISOString()

}    };



// GET handler for chat suggestions    return NextResponse.json(errorResponse, { status: 500 });

export async function GET(request: NextRequest) {  }

  try {}
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