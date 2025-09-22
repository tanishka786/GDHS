import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface StudyData {
  id: string;
  date: string;
  bodyPart: string;
  symptoms?: string;
  triage: {
    level: string;
    bodyPart?: string;
    detections?: Array<{
      label: string;
      score: number;
      bbox?: number[];
    }>;
    recommendations?: string[];
  };
  patientSummary?: string;
  recommendations: string[];
}

interface AnalysisRequest {
  patientId: string;
  studies: StudyData[];
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AnalysisRequest = await request.json();
    
    if (!body.patientId || !body.studies) {
      return NextResponse.json({ 
        error: 'Patient ID and studies are required' 
      }, { status: 400 });
    }

    if (body.studies.length === 0) {
      return NextResponse.json({ 
        error: 'At least one study is required for analysis' 
      }, { status: 400 });
    }

    // Get FastAPI base URL from environment or use default
    const fastApiUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';
    
    // Prepare the request data for FastAPI
    const analysisRequest = {
      patientId: body.patientId,
      studies: body.studies.map(study => ({
        id: study.id,
        date: study.date,
        bodyPart: study.bodyPart,
        symptoms: study.symptoms || '',
        triage: {
          level: study.triage.level,
          bodyPart: study.triage.bodyPart || study.bodyPart,
          detections: study.triage.detections || [],
          recommendations: study.triage.recommendations || []
        },
        patientSummary: study.patientSummary || '',
        recommendations: study.recommendations || []
      }))
    };

    console.log('Sending analysis request to FastAPI:', {
      patientId: body.patientId,
      studyCount: body.studies.length,
      url: `${fastApiUrl}/api/clinical-analysis/analyze-patient`
    });

    // Make request to FastAPI backend
    const response = await fetch(`${fastApiUrl}/api/clinical-analysis/analyze-patient`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OrthoAssist-NextJS/1.0'
      },
      body: JSON.stringify(analysisRequest),
      // Add timeout for the request
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FastAPI request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return NextResponse.json({ 
        error: `Clinical analysis failed: ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const analysisResult = await response.json();

    if (!analysisResult.success) {
      return NextResponse.json({ 
        error: 'Clinical analysis was not successful',
        details: analysisResult
      }, { status: 500 });
    }

    console.log('Clinical analysis completed successfully for patient:', body.patientId);

    return NextResponse.json({
      success: true,
      patientId: body.patientId,
      studiesAnalyzed: analysisResult.studies_analyzed,
      analysis: analysisResult.analysis,
      analysisTimestamp: analysisResult.analysis_timestamp,
      modelUsed: analysisResult.model_used
    });

  } catch (error) {
    console.error('Error in AI analysis:', error);
    
    // Handle specific error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({
        error: 'Unable to connect to analysis service',
        details: 'The AI analysis service is currently unavailable. Please try again later.'
      }, { status: 503 });
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({
        error: 'Analysis request timed out',
        details: 'The analysis is taking longer than expected. Please try again.'
      }, { status: 504 });
    }

    return NextResponse.json({
      error: 'Failed to generate AI analysis',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}