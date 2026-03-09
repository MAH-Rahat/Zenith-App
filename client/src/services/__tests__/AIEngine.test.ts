/**
 * AIEngine.test.ts
 * 
 * Unit tests for AIEngine service - Fog Mode task breakdown
 * 
 * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7, 25.8
 */

import { AIEngine, MicroStep } from '../AIEngine';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
}));

// Mock @google/generative-ai
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
}));

describe('AIEngine - Fog Mode', () => {
  let aiEngine: AIEngine;

  beforeEach(() => {
    aiEngine = new AIEngine();
    jest.clearAllMocks();
  });

  describe('breakdownTask', () => {
    it('should throw error when no API key is configured', async () => {
      // Requirement 25.8: Error handling
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue(null);

      await expect(aiEngine.breakdownTask('Build a website')).rejects.toThrow(
        'No API key configured'
      );
    });

    it('should return exactly 3 micro-steps', async () => {
      // Requirements 25.4, 25.6
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue('test-api-key');

      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            steps: [
              { step: 1, description: 'Design wireframes', estimatedMinutes: 20 },
              { step: 2, description: 'Set up React project', estimatedMinutes: 25 },
              { step: 3, description: 'Create homepage component', estimatedMinutes: 15 },
            ],
          }),
        },
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockGenerateContent = jest.fn().mockResolvedValue(mockResponse);
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent,
        }),
      }));

      await aiEngine.setApiKey('test-api-key');
      const result = await aiEngine.breakdownTask('Build a website');

      expect(result).toHaveLength(3);
      expect(result[0].step).toBe(1);
      expect(result[1].step).toBe(2);
      expect(result[2].step).toBe(3);
    });

    it('should validate each micro-step is minimum 5 characters', async () => {
      // Requirement 25.5
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue('test-api-key');

      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            steps: [
              { step: 1, description: 'Do', estimatedMinutes: 20 }, // Too short
              { step: 2, description: 'Set up React project', estimatedMinutes: 25 },
              { step: 3, description: 'Create homepage component', estimatedMinutes: 15 },
            ],
          }),
        },
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockGenerateContent = jest.fn().mockResolvedValue(mockResponse);
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent,
        }),
      }));

      await aiEngine.setApiKey('test-api-key');
      
      await expect(aiEngine.breakdownTask('Build a website')).rejects.toThrow(
        'AI generated micro-steps that are too short'
      );
    });

    it('should throw error if AI response does not contain exactly 3 steps', async () => {
      // Requirement 25.4
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue('test-api-key');

      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            steps: [
              { step: 1, description: 'Design wireframes', estimatedMinutes: 20 },
              { step: 2, description: 'Set up React project', estimatedMinutes: 25 },
            ],
          }),
        },
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockGenerateContent = jest.fn().mockResolvedValue(mockResponse);
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent,
        }),
      }));

      await aiEngine.setApiKey('test-api-key');
      
      await expect(aiEngine.breakdownTask('Build a website')).rejects.toThrow(
        'AI response does not contain exactly 3 steps'
      );
    });

    it('should handle API errors gracefully', async () => {
      // Requirement 25.8: Error handling
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue('test-api-key');

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockGenerateContent = jest.fn().mockRejectedValue(
        new Error('API_KEY_INVALID')
      );
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent,
        }),
      }));

      await aiEngine.setApiKey('test-api-key');
      
      await expect(aiEngine.breakdownTask('Build a website')).rejects.toThrow(
        'Invalid API key'
      );
    });

    it('should handle network errors', async () => {
      // Requirement 25.8: Error handling
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue('test-api-key');

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockGenerateContent = jest.fn().mockRejectedValue(
        new Error('Network error')
      );
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent,
        }),
      }));

      await aiEngine.setApiKey('test-api-key');
      
      await expect(aiEngine.breakdownTask('Build a website')).rejects.toThrow(
        'Failed to connect to AI service'
      );
    });

    it('should send correct prompt to Gemini API', async () => {
      // Requirement 25.3: Send description to Gemini API requesting 3 atomic micro-steps
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue('test-api-key');

      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            steps: [
              { step: 1, description: 'Design wireframes', estimatedMinutes: 20 },
              { step: 2, description: 'Set up React project', estimatedMinutes: 25 },
              { step: 3, description: 'Create homepage component', estimatedMinutes: 15 },
            ],
          }),
        },
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockGenerateContent = jest.fn().mockResolvedValue(mockResponse);
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent,
        }),
      }));

      await aiEngine.setApiKey('test-api-key');
      await aiEngine.breakdownTask('Build a website');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Break down this task into exactly 3 micro-steps')
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Build a website')
      );
    });
  });

  describe('API Key Management', () => {
    it('should store API key securely', async () => {
      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockResolvedValue(undefined);

      await aiEngine.setApiKey('test-api-key');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'gemini_api_key',
        'test-api-key'
      );
    });

    it('should check if API key exists', async () => {
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue('test-api-key');

      const hasKey = await aiEngine.hasApiKey();

      expect(hasKey).toBe(true);
    });

    it('should return masked API key', async () => {
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue('test-api-key-12345');

      const masked = await aiEngine.getMaskedApiKey();

      expect(masked).toBe('****2345');
    });
  });
});
