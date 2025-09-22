import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connect } from '@/lib/mongoose'
import Upload from '@/lib/models/upload'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authState = await auth()
    const userId = authState?.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to view analytics' },
        { status: 401 }
      )
    }

    // Connect to MongoDB
    await connect()

    // Get analytics data
    const [
      totalUploads,
      completedUploads,
      failedUploads,
      processingUploads,
      triageStats,
      bodyPartStats,
      recentUploads
    ] = await Promise.all([
      // Total uploads count
      Upload.countDocuments({ userId }),
      
      // Completed uploads count
      Upload.countDocuments({ userId, status: 'completed' }),
      
      // Failed uploads count
      Upload.countDocuments({ userId, status: 'failed' }),
      
      // Processing uploads count
      Upload.countDocuments({ userId, status: 'processing' }),
      
      // Triage level statistics
      Upload.aggregate([
        { $match: { userId, status: 'completed' } },
        { $group: { 
          _id: '$analysisResult.triage.level', 
          count: { $sum: 1 } 
        }}
      ]),
      
      // Body part statistics
      Upload.aggregate([
        { $match: { userId, status: 'completed' } },
        { $group: { 
          _id: '$analysisResult.triage.body_part', 
          count: { $sum: 1 } 
        }}
      ]),
      
      // Recent uploads (last 5)
      Upload.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('filename createdAt status analysisResult.triage.level analysisResult.triage.body_part')
        .exec()
    ])

    // Format triage statistics
    const triageDistribution = {
      RED: 0,
      AMBER: 0,
      GREEN: 0
    }
    
    triageStats.forEach((stat: any) => {
      if (stat._id && triageDistribution.hasOwnProperty(stat._id)) {
        triageDistribution[stat._id as keyof typeof triageDistribution] = stat.count
      }
    })

    // Format body part statistics
    const bodyPartDistribution: { [key: string]: number } = {}
    bodyPartStats.forEach((stat: any) => {
      if (stat._id) {
        bodyPartDistribution[stat._id] = stat.count
      }
    })

    // Calculate success rate
    const successRate = totalUploads > 0 ? (completedUploads / totalUploads) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalUploads,
          completedUploads,
          failedUploads,
          processingUploads,
          successRate: Math.round(successRate * 100) / 100
        },
        triageDistribution,
        bodyPartDistribution,
        recentUploads
      }
    })

  } catch (error) {
    console.error('Get analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}