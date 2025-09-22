"use server";

import User from "@/lib/models/user";
import { connect } from "@/lib/mongoose";

// Types for better type safety
interface UserData {
  clerkId: string;
  username?: string;
  email: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  clerkRaw?: any;
  plan?: string;
}

export async function CreateUser(userData: UserData) {
  try {
    console.log('Creating user with data:', userData);
    console.log('Connecting to MongoDB...');
    await connect();
    console.log('MongoDB connection successful');

    // Check if user already exists
    const existingUser = await User.findOne({ clerkId: userData.clerkId, isDeleted: { $ne: true } });
    if (existingUser) {
      console.log('User already exists:', existingUser._id);
      return JSON.parse(JSON.stringify(existingUser));
    }

    // Validate required fields
    if (!userData.email) {
      throw new Error('Email is required');
    }

    console.log('Creating new user in database...');
    const newUser = await User.create(userData);
    console.log('User created successfully in MongoDB:', newUser._id);
    console.log('User details:', {
      _id: newUser._id,
      clerkId: newUser.clerkId,
      email: newUser.email,
      firstName: newUser.firstName
    });
    
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function UpdateUser(clerkId: string, userData: Partial<UserData>) {
  try {
    console.log('Updating user:', clerkId, 'with data:', userData);
    await connect();

    const updateFields = { ...userData, updatedAt: new Date() };
    delete updateFields.clerkId; // Prevent updating clerkId

    const updatedUser = await User.findOneAndUpdate(
      { clerkId, isDeleted: { $ne: true } },
      { $set: updateFields },
      { new: true, upsert: false }
    );

    if (!updatedUser) {
      throw new Error(`User not found with clerkId: ${clerkId}`);
    }

    console.log('User updated successfully:', updatedUser._id);
    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function DeleteUser(clerkId: string) {
  try {
    console.log('Soft deleting user:', clerkId);
    await connect();

    const deletedUser = await User.findOneAndUpdate(
      { clerkId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, updatedAt: new Date() } },
      { new: true }
    );

    if (!deletedUser) {
      console.log(`User not found with clerkId: ${clerkId} or already deleted - this is normal`);
      // Return a mock response instead of throwing an error
      return { _id: null, clerkId, message: 'User not found or already deleted' };
    }

    console.log('User soft-deleted successfully:', deletedUser._id);
    return JSON.parse(JSON.stringify(deletedUser));
  } catch (error) {
    console.error('Error soft-deleting user:', error);
    throw new Error(`Failed to soft-delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function GetUser(clerkId: string) {
  try {
    await connect();

    const user = await User.findOne({
      clerkId,
      isDeleted: { $ne: true },
    });

    if (!user) {
      return null;
    }

    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}