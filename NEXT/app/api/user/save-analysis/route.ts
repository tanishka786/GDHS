import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/mongoose';
import Upload from '@/lib/models/upload';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Connect to MongoDB
    await connect();

    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      filename,
      processingMode,
      bodyPartPreference,
      patientSymptoms,
      notes,
      patientInfo,
      analysisResult
    } = body;

    // Validate required fields
    if (!filename || !processingMode || !bodyPartPreference || !analysisResult) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'filename, processingMode, bodyPartPreference, and analysisResult are required'
        },
        { status: 400 }
      );
    }

    // Create upload document
    const upload = await Upload.create({
      userId,
      filename,
      processingMode,
      bodyPartPreference,
      patientSymptoms: patientSymptoms || '',
      notes: notes || '',
      patientInfo: patientInfo || {},
      analysisResult,
      status: 'completed'
    });

    console.log('Analysis saved to MongoDB:', upload._id);

    return NextResponse.json({
      success: true,
      uploadId: upload._id.toString(),
      message: 'Analysis report saved successfully',
      data: {
        id: upload._id.toString(),
        createdAt: upload.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error saving analysis to MongoDB:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save analysis report',
        message: 'Failed to save analysis report. Please try again.'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Connect to MongoDB
    await connect();

    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Fetch user uploads
    const uploads = await Upload.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Upload.countDocuments({ userId });

    // Format response
    const formattedUploads = uploads.map(upload => ({
      ...upload,
      _id: (upload as any)._id.toString(),
      createdAt: (upload as any).createdAt.toISOString(),
      updatedAt: (upload as any).updatedAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      uploads: formattedUploads,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
        totalCount: total
      }
    });

  } catch (error) {
    console.error('Error fetching uploads:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch uploads',
        uploads: [],
        pagination: {
          current: 1,
          total: 0,
          hasNext: false,
          hasPrev: false,
          totalCount: 0
        }
      },
      { status: 500 }
    );
  }
}