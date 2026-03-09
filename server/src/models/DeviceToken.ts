/**
 * DeviceToken Model
 * 
 * Stores device tokens for push notifications.
 * 
 * Requirements:
 * - 62.3: Send device token to backend for notification targeting
 * - 65.2: Use Mongoose ODM for schema definitions
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IDeviceToken extends Document {
  userId: mongoose.Types.ObjectId;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceInfo?: {
    brand?: string;
    modelName?: string;
    osVersion?: string;
  };
  isActive: boolean;
  lastUpdated: Date;
  createdAt: Date;
}

const DeviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceToken: {
      type: String,
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true,
    },
    deviceInfo: {
      brand: String,
      modelName: String,
      osVersion: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
DeviceTokenSchema.index({ userId: 1, deviceToken: 1 }, { unique: true });

// Index for finding active tokens
DeviceTokenSchema.index({ userId: 1, isActive: 1 });

export const DeviceToken = mongoose.model<IDeviceToken>('DeviceToken', DeviceTokenSchema);
