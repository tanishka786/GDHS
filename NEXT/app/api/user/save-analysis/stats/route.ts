import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/mongoose';
import Upload from '@/lib/models/upload';
import { auth } from '@clerk/nextjs/server';

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

    // Get user statistics
    const stats = await Upload.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] }
          },
          redTriage: {
            $sum: { $cond: [{ $eq: ["$analysisResult.triage.level", "RED"] }, 1, 0] }
          },
          amberTriage: {
            $sum: { $cond: [{ $eq: ["$analysisResult.triage.level", "AMBER"] }, 1, 0] }
          },
          greenTriage: {
            $sum: { $cond: [{ $eq: ["$analysisResult.triage.level", "GREEN"] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      completed: 0,
      failed: 0,
      redTriage: 0,
      amberTriage: 0,
      greenTriage: 0
    };

    // Get recent uploads for timeline
    const recentUploads = await Upload.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('filename analysisResult.triage.level createdAt status')
      .lean();

    const formattedRecent = recentUploads.map(upload => ({
      id: (upload as any)._id.toString(),
      filename: upload.filename,
      triageLevel: upload.analysisResult?.triage?.level || 'UNKNOWN',
      status: upload.status,
      createdAt: (upload as any).createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      stats: result,
      recentUploads: formattedRecent
    });

  } catch (error) {
    console.error('Error fetching upload stats:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        stats: {
          total: 0,
          completed: 0,
          failed: 0,
          redTriage: 0,
          amberTriage: 0,
          greenTriage: 0
        },
        recentUploads: []
      },
      { status: 500 }
    );
  }
}