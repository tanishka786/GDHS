import { Schema, model, models, Document } from 'mongoose';

export interface IUpload extends Document {
  userId: string;
  filename: string;
  processingMode: string;
  bodyPartPreference: string;
  patientSymptoms?: string;
  notes?: string;
  
  // Patient Information
  patientInfo?: {
    patientId?: string;
    name?: string;
    dob?: string; // Date of birth (ISO date string)
    age?: number;
    gender?: 'male' | 'female' | 'other' | 'unknown';
    mrn?: string; // Medical Record Number
    phone?: string;
    email?: string;
    additional?: string; // Additional notes about patient
  };
  
  // AI Analysis Results
  analysisResult: {
    cloudinary_urls?: {
      original_image_url?: string;
      annotated_image_url?: string;
    };
    triage?: {
      level: 'RED' | 'AMBER' | 'GREEN';
      body_part?: string;
      detections?: Array<{
        label: string;
        score: number;
        bbox?: number[];
      }>;
      recommendations?: string[];
    };
    patient_summary?: string;
    processing_time?: number;
    confidence_score?: number;
    pdf_report?: {
      content?: string; // base64 encoded PDF
      filename?: string;
      size_bytes?: number;
    };
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  status: 'processing' | 'completed' | 'failed';
}

const UploadSchema = new Schema<IUpload>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  processingMode: {
    type: String,
    required: true,
    enum: ['Automatic - Full AI Pipeline', 'Manual Review', 'Quick Analysis', 'Detailed Analysis']
  },
  bodyPartPreference: {
    type: String,
    required: true,
    enum: ['Auto-detect', 'Hand/Wrist', 'Leg/Foot']
  },
  patientSymptoms: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  
  // Patient Information
  patientInfo: {
    patientId: { type: String, default: '' },
    name: { type: String, default: '' },
    dob: { type: String, default: '' }, // Date of birth
    age: { type: Number },
    gender: { 
      type: String, 
      enum: ['male', 'female', 'other', 'unknown'], 
      default: 'unknown' 
    },
    mrn: { type: String, default: '' }, // Medical Record Number
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    additional: { type: String, default: '' } // Additional patient notes
  },
  
  // AI Analysis Results
  analysisResult: {
    cloudinary_urls: {
      original_image_url: String,
      annotated_image_url: String
    },
    triage: {
      level: {
        type: String,
        enum: ['RED', 'AMBER', 'GREEN']
      },
      body_part: String,
      detections: [{
        label: String,
        score: Number,
        bbox: [Number]
      }],
      recommendations: [String]
    },
    patient_summary: String,
    processing_time: Number,
    confidence_score: Number,
    pdf_report: {
      content: String, // base64 encoded PDF
      filename: String,
      size_bytes: Number
    }
  },
  
  // Metadata
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Create indexes for better query performance
UploadSchema.index({ userId: 1, createdAt: -1 });
UploadSchema.index({ 'analysisResult.triage.level': 1 });
UploadSchema.index({ status: 1 });
UploadSchema.index({ 'patientInfo.patientId': 1 });
UploadSchema.index({ 'patientInfo.name': 1 });

const Upload = models?.Upload || model<IUpload>('Upload', UploadSchema);

export default Upload;
