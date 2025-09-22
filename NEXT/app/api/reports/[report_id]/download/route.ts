import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

// Helper function to make requests to FastAPI backend
async function callFastAPIEndpoint(
  endpoint: string,
  method: string = 'GET'
): Promise<Response> {
  const response = await fetch(`${FASTAPI_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Accept': 'application/pdf',
    },
  });

  return response;
}

// GET handler for downloading PDF reports
export async function GET(
  request: NextRequest,
  { params }: { params: { report_id: string } }
) {
  try {
    const reportId = params.report_id;

    if (!reportId) {
      return NextResponse.json(
        { 
          error: 'Report ID is required',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validate report ID format (basic UUID validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reportId)) {
      return NextResponse.json(
        { 
          error: 'Invalid report ID format',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.log(`Attempting to download report: ${reportId}`);

    // Try to get the PDF from FastAPI backend first
    try {
      const fastAPIResponse = await callFastAPIEndpoint(`/api/reports/${reportId}/download`);
      
      if (fastAPIResponse.ok) {
        const pdfBuffer = await fastAPIResponse.arrayBuffer();
        
        // Create response with proper headers for PDF download
        const response = new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="orthoassist_report_${reportId.slice(0, 8)}.pdf"`,
            'Content-Length': pdfBuffer.byteLength.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        });

        console.log(`Successfully served report ${reportId} from FastAPI`);
        return response;
      }
    } catch (fastAPIError) {
      console.warn(`FastAPI download failed for ${reportId}:`, fastAPIError);
    }

    // Fallback: Try to serve from local storage
    const reportsDir = path.join(process.cwd(), 'reports');
    const possibleFilenames = [
      `orthoassist_report_${reportId}.pdf`,
      `report_${reportId}.pdf`,
      `${reportId}.pdf`
    ];

    for (const filename of possibleFilenames) {
      const filePath = path.join(reportsDir, filename);
      
      try {
        await fs.access(filePath);
        const fileBuffer = await fs.readFile(filePath);
        
        console.log(`Successfully served report ${reportId} from local storage: ${filename}`);
        
        return new NextResponse(new Uint8Array(fileBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="orthoassist_report_${reportId.slice(0, 8)}.pdf"`,
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        });
      } catch (fileError) {
        // File doesn't exist, continue to next filename
        continue;
      }
    }

    // If we get here, the report wasn't found anywhere
    console.error(`Report not found: ${reportId}`);
    return NextResponse.json(
      { 
        error: 'Report not found. The report may have expired or the ID is incorrect.',
        code: 'REPORT_NOT_FOUND',
        timestamp: new Date().toISOString()
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('Download error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to download report',
        details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}