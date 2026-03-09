import mongoose from 'mongoose';
import { config } from './index';

interface ConnectionOptions {
  maxRetries: number;
  retryDelay: number;
}

const defaultOptions: ConnectionOptions = {
  maxRetries: 5,
  retryDelay: 5000, // 5 seconds
};

let isConnected = false;
let retryCount = 0;

export async function connectDatabase(options: ConnectionOptions = defaultOptions): Promise<void> {
  if (isConnected) {
    console.log('📦 MongoDB: Already connected');
    return;
  }

  try {
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    retryCount = 0;
    
    console.log('✅ MongoDB Atlas connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      isConnected = true;
    });

  } catch (error) {
    retryCount++;
    console.error(`❌ MongoDB connection failed (attempt ${retryCount}/${options.maxRetries}):`, error);

    if (retryCount < options.maxRetries) {
      console.log(`🔄 Retrying in ${options.retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, options.retryDelay));
      return connectDatabase(options);
    } else {
      console.error('💥 MongoDB connection failed after maximum retries');
      throw new Error('Failed to connect to MongoDB Atlas after multiple attempts');
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('👋 MongoDB disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
}

export function getDatabaseConnection() {
  return mongoose.connection;
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
