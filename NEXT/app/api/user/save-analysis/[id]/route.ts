import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/mongoose';
import Upload from '@/lib/models/upload';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const uploadId = params.id;

    // Validate upload ID
    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      );
    }

    // Fetch the specific upload
    const upload = await Upload.findOne({ 
      _id: uploadId, 
      userId 
    }).lean();

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload not found or access denied' },
        { status: 404 }
      );
    }

    // Format response
    const formattedUpload = {
      ...upload,
      _id: (upload as any)._id.toString(),
      createdAt: (upload as any).createdAt.toISOString(),
      updatedAt: (upload as any).updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      upload: formattedUpload
    });

  } catch (error) {
    console.error('Error fetching upload:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch upload'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const uploadId = params.id;

    // Validate upload ID
    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      );
    }

    // Delete the upload
    const result = await Upload.deleteOne({ 
      _id: uploadId, 
      userId 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Upload not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Upload deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting upload:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete upload'
      },
      { status: 500 }
    );
  }
}