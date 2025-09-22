import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

interface MongooseConn {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

let cached: MongooseConn = (global as any).mongoose || {
  conn: null,
  promise: null,
};

if (!(global as any).mongoose) {
  (global as any).mongoose = cached;
}

export const connect = async () => {
  if (cached.conn) {
    console.log('Using cached MongoDB connection');
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in .env.local');
  }

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      cached.promise =
        cached.promise ||
        mongoose.connect(MONGODB_URI, {
          dbName: 'orthopedic-assistant',
          bufferCommands: false,
          connectTimeoutMS: 30000,
          serverSelectionTimeoutMS: 5000,
        });

      cached.conn = await cached.promise;
      console.log('MongoDB Connected to orthopedic-assistant');
      return cached.conn;
    } catch (error) {
      retryCount++;
      console.error(`MongoDB Connection Attempt ${retryCount} Failed:`, error);
      if (retryCount === maxRetries) {
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
    }
  }
};