
import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    clerkId: { 
      type: String,
       unique: true, index: true, 
       required: true },
    username: String,

    // Primary/derived fields
    email: String,
    phoneNumber: String,
    firstName: String,
    lastName: String,
    imageUrl: String,

    // Nice to keep for debugging / future features
    clerkRaw: Schema.Types.Mixed,

  // Subscription plan (free, plus, etc.)
  plan: { type: String, default: 'free' },

    // Soft delete flag (flip on user.deleted)
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = models.User || model("User", userSchema);

export default User;
