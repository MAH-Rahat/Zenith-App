import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface IUserProfile extends Document {
  userId: mongoose.Types.ObjectId;
  githubUsername?: string;
  githubToken?: string;
  geminiApiKey?: string;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods for decrypting sensitive fields
  getGithubToken(): string | undefined;
  getGeminiApiKey(): string | undefined;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    githubUsername: {
      type: String,
      trim: true,
    },
    githubToken: {
      type: String,
      set: (value: string) => value ? encrypt(value) : value, // Encrypt on save
    },
    geminiApiKey: {
      type: String,
      set: (value: string) => value ? encrypt(value) : value, // Encrypt on save
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'user_profiles',
  }
);

// Indexes for efficient queries
UserProfileSchema.index({ syncedAt: -1 });

// TTL index for 12-month data retention policy
UserProfileSchema.index(
  { syncedAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 } // 12 months in seconds
);

// Methods to get decrypted sensitive fields
UserProfileSchema.methods.getGithubToken = function(): string | undefined {
  return this.githubToken ? decrypt(this.githubToken) : undefined;
};

UserProfileSchema.methods.getGeminiApiKey = function(): string | undefined {
  return this.geminiApiKey ? decrypt(this.geminiApiKey) : undefined;
};

// Don't return encrypted fields in JSON responses
UserProfileSchema.set('toJSON', {
  transform: (_doc, ret) => {
    Reflect.deleteProperty(ret, 'githubToken');
    Reflect.deleteProperty(ret, 'geminiApiKey');
    Reflect.deleteProperty(ret, '__v');
    return ret;
  },
});

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
