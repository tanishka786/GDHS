import { NextRequest, NextResponse } from 'next/server';
import { MCPToolRequest, MCPToolResponse, ApiError } from '@/lib/types/chat';

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

// POST handler for executing MCP tools
export async function POST(
  request: NextRequest,
  { params }: { params: { tool_name: string } }
) {
  try {
    const toolName = params.tool_name;
    const body: Omit<MCPToolRequest, 'tool_name'> = await request.json();

    if (!toolName) {
      return NextResponse.json(
        { 
          error: 'Tool name is required',
          timestamp: new Date().toISOString()
        } as ApiError,
        { status: 400 }
      );
    }

    if (!body.parameters) {
      return NextResponse.json(
        { 
          error: 'Tool parameters are required',
          timestamp: new Date().toISOString()
        } as ApiError,
        { status: 400 }
      );
    }

    // Prepare request data for FastAPI
    const requestData: MCPToolRequest = {
      tool_name: toolName,
      parameters: body.parameters,
      chat_id: body.chat_id
    };

    // Call FastAPI MCP tool endpoint
    const response: MCPToolResponse = await callFastAPIEndpoint(
      `/api/mcp/tools/${toolName}`,
      requestData
    );

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('MCP tool execution API error:', error);
    
    const errorResponse: ApiError = {
      error: error instanceof Error ? error.message : 'Failed to execute MCP tool',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}