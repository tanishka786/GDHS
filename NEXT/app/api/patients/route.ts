import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connect } from '@/lib/mongoose';   
import Upload from '@/lib/models/upload';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connect();

    // Fetch all uploads for the user with patient information
    const uploads = await Upload.find({ 
      userId,
      status: 'completed',
      'patientInfo.patientId': { $exists: true, $ne: '' }
    })
    .select('patientInfo analysisResult createdAt updatedAt filename')
    .sort({ createdAt: -1 });

    // Group by patient ID to get unique patients
    const patientMap = new Map();
    
    uploads.forEach((upload) => {
      const patientId = upload.patientInfo?.patientId;
      
      if (patientId && !patientMap.has(patientId)) {
        patientMap.set(patientId, {
          patientId,
          name: upload.patientInfo?.name || 'Unknown Patient',
          age: upload.patientInfo?.age,
          gender: upload.patientInfo?.gender,
          mrn: upload.patientInfo?.mrn,
          phone: upload.patientInfo?.phone,
          email: upload.patientInfo?.email,
          lastVisit: upload.createdAt,
          totalStudies: 1,
          lastTriageLevel: upload.analysisResult?.triage?.level,
          lastBodyPart: upload.analysisResult?.triage?.body_part
        });
      } else if (patientId && patientMap.has(patientId)) {
        // Update study count for existing patient
        const patient = patientMap.get(patientId);
        patient.totalStudies += 1;
        
        // Update last visit if this upload is more recent
        if (upload.createdAt > patient.lastVisit) {
          patient.lastVisit = upload.createdAt;
          patient.lastTriageLevel = upload.analysisResult?.triage?.level;
          patient.lastBodyPart = upload.analysisResult?.triage?.body_part;
        }
      }
    });

    const patients = Array.from(patientMap.values());

    return NextResponse.json({ 
      success: true, 
      patients,
      total: patients.length 
    });

  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}