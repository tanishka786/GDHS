"use server";

import { connect } from "@/lib/mongoose";
import Upload, { IUpload } from "@/lib/models/upload";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export interface CreateUploadParams {
  filename: string;
  processingMode: string;
  bodyPartPreference: string;
  patientSymptoms?: string;
  notes?: string;
  analysisResult: any;
}

export async function createUpload(params: CreateUploadParams) {
  try {
    await connect();

    const { userId } = await auth();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const {
      filename,
      processingMode,
      bodyPartPreference,
      patientSymptoms,
      notes,
      analysisResult
    } = params;

    // Create upload document
    const upload = await Upload.create({
      userId,
      filename,
      processingMode,
      bodyPartPreference,
      patientSymptoms: patientSymptoms || '',
      notes: notes || '',
      analysisResult,
      status: 'completed'
    });

    console.log('Upload saved to MongoDB:', upload._id);

    // Revalidate relevant pages
    revalidatePath('/dashboard/upload');
    revalidatePath('/dashboard/history');

    return {
      success: true,
      uploadId: upload._id.toString(),
      message: "Analysis report saved successfully"
    };

  } catch (error) {
    console.error('Error saving upload to MongoDB:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save analysis report",
      message: "Failed to save analysis report. Please try again."
    };
  }
}

export async function getUserUploads(userId: string, limit = 10, page = 1) {
  try {
    await connect();

    const skip = (page - 1) * limit;

    const uploads = await Upload.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Upload.countDocuments({ userId });

    return {
      success: true,
      uploads: uploads.map(upload => ({
        ...upload,
        _id: (upload as any)._id.toString(),
        createdAt: (upload as any).createdAt.toISOString(),
        updatedAt: (upload as any).updatedAt.toISOString()
      })),
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

  } catch (error) {
    console.error('Error fetching user uploads:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch uploads",
      uploads: [],
      pagination: {
        current: 1,
        total: 0,
        hasNext: false,
        hasPrev: false
      }
    };
  }
}

export async function getUploadById(uploadId: string) {
  try {
    await connect();

    const { userId } = await auth();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const upload = await Upload.findOne({ 
      _id: uploadId, 
      userId 
    }).lean();

    if (!upload) {
      return {
        success: false,
        error: "Upload not found or access denied"
      };
    }

    return {
      success: true,
      upload: {
        ...upload,
        _id: (upload as any)._id.toString(),
        createdAt: (upload as any).createdAt.toISOString(),
        updatedAt: (upload as any).updatedAt.toISOString()
      }
    };

  } catch (error) {
    console.error('Error fetching upload:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch upload"
    };
  }
}

export async function deleteUpload(uploadId: string) {
  try {
    await connect();

    const { userId } = await auth();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const result = await Upload.deleteOne({ 
      _id: uploadId, 
      userId 
    });

    if (result.deletedCount === 0) {
      return {
        success: false,
        error: "Upload not found or access denied"
      };
    }

    // Revalidate relevant pages
    revalidatePath('/dashboard/upload');
    revalidatePath('/dashboard/history');

    return {
      success: true,
      message: "Upload deleted successfully"
    };

  } catch (error) {
    console.error('Error deleting upload:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete upload"
    };
  }
}

export async function getUploadStats(userId: string) {
  try {
    await connect();

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

    return {
      success: true,
      stats: result
    };

  } catch (error) {
    console.error('Error fetching upload stats:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats",
      stats: {
        total: 0,
        completed: 0,
        failed: 0,
        redTriage: 0,
        amberTriage: 0,
        greenTriage: 0
      }
    };
  }
}
