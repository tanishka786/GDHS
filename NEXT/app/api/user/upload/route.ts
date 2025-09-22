import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { connect } from '@/lib/mongoose'
import Upload from '@/lib/models/upload'

export async function POST(request: NextRequest) {
  try {
    // Check authentication (server-side)
    const authState = await auth()
    const userId = authState?.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to upload images' },
        { status: 401 }
      )
    }

   

    const formData = await request.formData()
    const file = formData.get('file') as File
    const notes = formData.get('notes') as string
    const processingMode = formData.get('processingMode') as string
    const patientSymptoms = formData.get('patientSymptoms') as string
    const bodyPartPreference = formData.get('bodyPartPreference') as string

    // Extract patient information
    const patientId = formData.get('patientId') as string
    const patientName = formData.get('patientName') as string
    const patientDob = formData.get('patientDob') as string
    const patientAge = formData.get('patientAge') as string
    const patientGender = formData.get('patientGender') as string
    const patientMrn = formData.get('patientMrn') as string
    const patientPhone = formData.get('patientPhone') as string
    const patientEmail = formData.get('patientEmail') as string
    const patientAdditional = formData.get('patientAdditional') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/dicom']
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.dcm')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, or DICOM files.' },
        { status: 400 }
      )
    }

    // Convert file to base64 for JSON payload
    const arrayBuffer = await file.arrayBuffer()
    const base64File = Buffer.from(arrayBuffer).toString('base64')

    // Create JSON payload for FastAPI - matching expected schema
    const payload = {
      // File data
      file_data: base64File,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      
      // Analysis configuration
      processing_mode: processingMode || "Automatic - Full AI Pipeline",
      body_part_preference: bodyPartPreference || "Auto-detect",
      
      // User information
      user_id: userId,
      
      // Patient information for PDF generation
      patient_info: {
        ...(patientId && { patient_id: patientId }),
        ...(patientName && { name: patientName }),
        ...(patientDob && { date_of_birth: patientDob }),
        ...(patientAge && { age: parseInt(patientAge) }),
        ...(patientGender && { gender: patientGender }),
        ...(patientMrn && { mrn: patientMrn }),
        ...(patientPhone && { phone: patientPhone }),
        ...(patientEmail && { email: patientEmail }),
        ...(patientAdditional && { additional_notes: patientAdditional })
      },
      
      // Optional fields
      ...(notes && { clinical_notes: notes }),
      ...(patientSymptoms && { patient_symptoms: patientSymptoms }),
      
      // Request metadata
      timestamp: new Date().toISOString(),
      source: "web_frontend"
    }

    console.log('Sending payload to FastAPI:', {
      file_name: payload.file_name,
      file_type: payload.file_type,
      processing_mode: payload.processing_mode,
      body_part_preference: payload.body_part_preference,
      user_id: payload.user_id,
      has_notes: !!notes,
      has_symptoms: !!patientSymptoms,
      has_patient_info: Object.keys(payload.patient_info).length > 0,
      patient_name: patientName || 'not provided',
      file_size_bytes: file.size,
      timestamp: payload.timestamp,
      source: payload.source
    })

    // Test backend connectivity first
    try {
      const healthCheck = await fetch('http://localhost:8000/api/info', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (!healthCheck.ok) {
        console.error('Backend health check failed:', healthCheck.status)
        return NextResponse.json(
          { error: 'Backend service unavailable' },
          { status: 503 }
        )
      }
      
      console.log('Backend health check passed')
    } catch (error) {
      console.error('Cannot connect to backend:', error)
      return NextResponse.json(
        { error: 'Cannot connect to analysis service' },
        { status: 503 }
      )
    }

    // Forward request to FastAPI backend
    const response = await fetch('http://localhost:8000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('FastAPI error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      
      // Try to parse the error as JSON to get more details
      let errorData
      try {
        errorData = JSON.parse(errorText)
        console.error('Detailed FastAPI error:', {
          error_code: errorData.error?.code,
          error_message: errorData.error?.message,
          support_info: errorData.error?.support,
          request_id: errorData.request_id,
          timestamp: errorData.error?.timestamp
        })
      } catch {
        errorData = { message: errorText }
      }
      
      // Provide specific error messages based on error type
      let userMessage = 'Analysis service error'
      if (errorData.error?.code === 'ORCHESTRATION_ERROR') {
        userMessage = 'AI analysis pipeline is currently unavailable. The backend services may be starting up or experiencing issues.'
      } else if (errorData.error?.code === 'MODEL_ERROR') {
        userMessage = 'AI models are not available. Please try again in a few moments.'
      } else if (errorData.error?.code === 'FILE_PROCESSING_ERROR') {
        userMessage = 'Unable to process the uploaded image. Please try a different file format.'
      }
      
      // Store failed upload in MongoDB for tracking
      try {
        await connect()
        
        const failedUpload = new Upload({
          userId: userId,
          filename: file.name,
          processingMode: processingMode || "Automatic - Full AI Pipeline",
          bodyPartPreference: bodyPartPreference || "Auto-detect",
          patientSymptoms: patientSymptoms || '',
          notes: notes || '',
          
          // Patient Information
          patientInfo: {
            patientId: patientId || '',
            name: patientName || '',
            dob: patientDob || '',
            age: patientAge ? parseInt(patientAge) : undefined,
            gender: patientGender || 'unknown',
            mrn: patientMrn || '',
            phone: patientPhone || '',
            email: patientEmail || '',
            additional: patientAdditional || ''
          },
          
          // Store error information in analysisResult
          analysisResult: {
            cloudinary_urls: {
              original_image_url: '',
              annotated_image_url: ''
            },
            triage: {
              level: 'AMBER',
              body_part: '',
              detections: [],
              recommendations: []
            },
            patient_summary: `Analysis failed: ${userMessage}`,
            processing_time: 0,
            confidence_score: 0,
            pdf_report: {
              content: '',
              filename: '',
              size_bytes: 0
            }
          },
          
          status: 'failed'
        })
        
        await failedUpload.save()
        console.log(`Failed upload stored in MongoDB for user: ${userId}`)
        
      } catch (dbError) {
        console.error('Failed to store failed upload in MongoDB:', dbError)
      }
      
      return NextResponse.json(
        { 
          error: userMessage,
          details: errorData,
          support_message: errorData.error?.support?.message || 'Please contact support if this error persists.',
          error_id: errorData.error?.support?.error_id,
          request_id: errorData.request_id
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // Store the upload response in MongoDB
    try {
      await connect()
      
      // Create the upload document with the analysis result
      const uploadDoc = new Upload({
        userId: userId,
        filename: file.name,
        processingMode: processingMode || "Automatic - Full AI Pipeline",
        bodyPartPreference: bodyPartPreference || "Auto-detect",
        patientSymptoms: patientSymptoms || '',
        notes: notes || '',
        
        // Patient Information
        patientInfo: {
          patientId: patientId || '',
          name: patientName || '',
          dob: patientDob || '',
          age: patientAge ? parseInt(patientAge) : undefined,
          gender: patientGender || 'unknown',
          mrn: patientMrn || '',
          phone: patientPhone || '',
          email: patientEmail || '',
          additional: patientAdditional || ''
        },
        
        // Store the complete analysis result
        analysisResult: {
          cloudinary_urls: {
            original_image_url: result.cloudinary_urls?.original_image_url || '',
            annotated_image_url: result.cloudinary_urls?.annotated_image_url || ''
          },
          triage: {
            level: result.triage?.level || 'AMBER',
            body_part: result.triage?.body_part || '',
            detections: result.triage?.detections || [],
            recommendations: result.triage?.recommendations || []
          },
          patient_summary: result.patient_summary || '',
          processing_time: result.steps?.processing?.duration_ms || 0,
          confidence_score: result.triage?.confidence || 0,
          pdf_report: {
            content: result.pdf_report?.content || '',
            filename: result.pdf_report?.filename || '',
            size_bytes: result.pdf_report?.size_bytes || 0
          }
        },
        
        status: 'completed'
      })
      
      const savedUpload = await uploadDoc.save()
      console.log(`Upload stored in MongoDB with ID: ${savedUpload._id}`)
      
      // Return the response with the MongoDB document ID
      return NextResponse.json({
        success: true,
        data: result,
        userId: userId,
        uploadId: savedUpload._id // Include the MongoDB document ID
      })
      
    } catch (dbError) {
      console.error('Failed to store upload in MongoDB:', dbError)
      
      // Still return the analysis result even if DB storage fails
      // This ensures the user gets their analysis results
      return NextResponse.json({
        success: true,
        data: result,
        userId: userId,
        warning: 'Analysis completed but failed to store in database'
      })
    }

  } catch (error) {
    console.error('Upload error:', error)
    
    // Store failed upload in MongoDB for general errors
    try {
      // Re-extract userId in case it wasn't available in the outer scope
      const authState = await auth()
      const errorUserId = authState?.userId
      
      if (errorUserId) {
        await connect()
        
        const failedUpload = new Upload({
          userId: errorUserId,
          filename: 'unknown',
          processingMode: "Automatic - Full AI Pipeline",
          bodyPartPreference: "Auto-detect",
          patientSymptoms: '',
          notes: '',
          
          // Patient Information
          patientInfo: {
            patientId: '',
            name: '',
            dob: '',
            age: undefined,
            gender: 'unknown',
            mrn: '',
            phone: '',
            email: '',
            additional: ''
          },
          
          // Store error information in analysisResult
          analysisResult: {
            cloudinary_urls: {
              original_image_url: '',
              annotated_image_url: ''
            },
            triage: {
              level: 'AMBER',
              body_part: '',
              detections: [],
              recommendations: []
            },
            patient_summary: `System error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            processing_time: 0,
            confidence_score: 0,
            pdf_report: {
              content: '',
              filename: '',
              size_bytes: 0
            }
          },
          
          status: 'failed'
        })
        
        await failedUpload.save()
        console.log(`General error upload stored in MongoDB for user: ${errorUserId}`)
      }
      
    } catch (dbError) {
      console.error('Failed to store error upload in MongoDB:', dbError)
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}