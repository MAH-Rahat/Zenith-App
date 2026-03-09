import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  totalEXP: number;
  level: number;
  rank: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual property for decrypted password
  getPasswordHash(): string;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      set: (value: string) => encrypt(value), // Encrypt on save
    },
    totalEXP: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
    },
    rank: {
      type: String,
      default: 'Script Novice',
      enum: [
        'Script Novice',
        'Function Apprentice',
        'Component Engineer',
        'Stack Architect',
        'Systems Operator',
        'AI Engineer Candidate',
        'Principal Builder',
        'Zenith Engineer',
      ],
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Index for efficient queries
UserSchema.index({ createdAt: 1 });

// Method to get decrypted password hash
UserSchema.methods.getPasswordHash = function(): string {
  return decrypt(this.passwordHash);
};

// Don't return passwordHash in JSON responses
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    Reflect.deleteProperty(ret, 'passwordHash');
    Reflect.deleteProperty(ret, '__v');
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
