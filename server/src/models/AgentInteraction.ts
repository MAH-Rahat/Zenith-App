import mongoose, { Schema, Document } from 'mongoose';

export type AgentType = 'operator' | 'sentinel' | 'broker' | 'architect' | 'forge' | 'signal';

export interface IAgentInteraction extends Document {
  userId: mongoose.Types.ObjectId;
  agent: AgentType;
  input: string;
  output: any;
  timestamp: Date;
  processingTimeMs?: number;
  createdAt: Date;
}

const AgentInteractionSchema = new Schema<IAgentInteraction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agent: {
      type: String,
      required: true,
      enum: ['operator', 'sentinel', 'broker', 'architect', 'forge', 'signal'],
      index: true,
    },
    input: {
      type: String,
      required: true,
    },
    output: {
      type: Schema.Types.Mixed,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    processingTimeMs: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'agent_interactions',
  }
);

// Compound indexes for efficient queries
AgentInteractionSchema.index({ userId: 1, timestamp: -1 });
AgentInteractionSchema.index({ userId: 1, agent: 1, timestamp: -1 });

// TTL index for 12-month data retention policy
// MongoDB will automatically delete documents older than 12 months
AgentInteractionSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 } // 12 months in seconds
);

export const AgentInteraction = mongoose.model<IAgentInteraction>(
  'AgentInteraction',
  AgentInteractionSchema
);
