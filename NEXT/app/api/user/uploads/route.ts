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
        { error: 'Unauthorized - Please sign in to view uploads' },
        { status: 401 }
      )
    }

    // Connect to MongoDB
    await connect()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') // 'completed', 'failed', 'processing'
    const triageLevel = searchParams.get('triage') // 'RED', 'AMBER', 'GREEN'
    const bodyPart = searchParams.get('bodyPart') // filter by body part

    // Build query
    const query: any = { userId }
    
    if (status) {
      query.status = status
    }
    
    if (triageLevel) {
      query['analysisResult.triage.level'] = triageLevel
    }
    
    if (bodyPart) {
      query['analysisResult.triage.body_part'] = new RegExp(bodyPart, 'i')
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get uploads with pagination
    const uploads = await Upload.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .exec()

    // Get total count for pagination
    const totalUploads = await Upload.countDocuments(query)
    const totalPages = Math.ceil(totalUploads / limit)

    // Return paginated results
    return NextResponse.json({
      success: true,
      data: {
        uploads,
        pagination: {
          currentPage: page,
          totalPages,
          totalUploads,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Get uploads error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get specific upload by ID
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authState = await auth()
    const userId = authState?.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to view upload' },
        { status: 401 }
      )
    }

    const { uploadId } = await request.json()

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      )
    }

    // Connect to MongoDB
    await connect()

    // Find upload by ID and userId (for security)
    const upload = await Upload.findOne({
      _id: uploadId,
      userId: userId
    }).exec()

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: upload
    })

  } catch (error) {
    console.error('Get upload by ID error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}