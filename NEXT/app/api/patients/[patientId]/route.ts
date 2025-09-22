import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connect } from '@/lib/mongoose';
import Upload from '@/lib/models/upload';

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patientId } = params;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    await connect();

    // Fetch all uploads for the specific patient
    const uploads = await Upload.find({ 
      userId,
      'patientInfo.patientId': patientId,
      status: 'completed'
    })
    .select('patientInfo analysisResult createdAt updatedAt filename processingMode bodyPartPreference patientSymptoms notes')
    .sort({ createdAt: -1 });

    if (uploads.length === 0) {
      return NextResponse.json({ 
        error: 'No studies found for this patient' 
      }, { status: 404 });
    }

    // Get patient info from the most recent upload
    const patientInfo = uploads[0].patientInfo;

    // Format the studies for display
    const studies = uploads.map((upload, index) => ({
      id: upload._id,
      studyNumber: uploads.length - index, // Study 1, 2, 3, etc.
      date: upload.createdAt,
      filename: upload.filename,
      processingMode: upload.processingMode,
      bodyPart: upload.bodyPartPreference,
      symptoms: upload.patientSymptoms,
      notes: upload.notes,
      
      // Analysis results
      triage: {
        level: upload.analysisResult?.triage?.level,
        bodyPart: upload.analysisResult?.triage?.body_part,
        detections: upload.analysisResult?.triage?.detections || [],
        recommendations: upload.analysisResult?.triage?.recommendations || []
      },
      
      // Images
      images: {
        original: upload.analysisResult?.cloudinary_urls?.original_image_url,
        annotated: upload.analysisResult?.cloudinary_urls?.annotated_image_url
      },
      
      // AI Summary
      patientSummary: upload.analysisResult?.patient_summary,
      confidenceScore: upload.analysisResult?.confidence_score,
      processingTime: upload.analysisResult?.processing_time,
      
      // PDF Report
      pdfReport: upload.analysisResult?.pdf_report ? {
        filename: upload.analysisResult.pdf_report.filename,
        sizeBytes: upload.analysisResult.pdf_report.size_bytes
      } : null
    }));

    return NextResponse.json({ 
      success: true, 
      patient: {
        patientId: patientInfo?.patientId,
        name: patientInfo?.name || 'Unknown Patient',
        age: patientInfo?.age,
        gender: patientInfo?.gender,
        mrn: patientInfo?.mrn,
        phone: patientInfo?.phone,
        email: patientInfo?.email,
        dob: patientInfo?.dob,
        additional: patientInfo?.additional
      },
      studies,
      totalStudies: studies.length 
    });

  } catch (error) {
    console.error('Error fetching patient studies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient studies' },
      { status: 500 }
    );
  }
}