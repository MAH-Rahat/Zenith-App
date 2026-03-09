import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'operator' | 'sentinel' | 'broker' | 'architect' | 'forge' | 'signal' | 'system';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  timestamp: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['operator', 'sentinel', 'broker', 'architect', 'forge', 'signal', 'system'],
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'notifications',
  }
);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, timestamp: -1 });
NotificationSchema.index({ userId: 1, isRead: 1, timestamp: -1 });

// TTL index for 30-day data retention policy
// MongoDB will automatically delete notifications older than 30 days
NotificationSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days in seconds
);

export const Notification = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
