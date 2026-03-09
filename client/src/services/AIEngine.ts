import { GoogleGenerativeAI } from '@google/generative-ai';
import * as SecureStore from 'expo-secure-store';

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export interface MicroStep {
  step: number;
  description: string;
  estimatedMinutes: number;
}

export class AIEngine {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  private lastError: string | null = null;

  /**
   * Set and store API key securely
   */
  async setApiKey(key: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key);
      this.apiKey = key;
      this.genAI = new GoogleGenerativeAI(key);
      this.lastError = null;
      console.log('API key set successfully');
    } catch (error) {
      console.error('Failed to set API key:', error);
      throw new Error('Failed to store API key securely');
    }
  }

  /**
   * Load API key from secure storage
   */
  private async loadApiKey(): Promise<string | null> {
    try {
      const key = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
      if (key) {
        this.apiKey = key;
        this.genAI = new GoogleGenerativeAI(key);
      }
      return key;
    } catch (error) {
      console.error('Failed to load API key:', error);
      return null;
    }
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        await this.loadApiKey();
      }

      if (!this.apiKey || !this.genAI) {
        this.lastError = 'No API key configured';
        return false;
      }

      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent('Test');
      
      if (result.response) {
        this.lastError = null;
        return true;
      }

      this.lastError = 'Invalid API response';
      return false;
    } catch (error: any) {
      console.error('API key validation failed:', error);
      
      if (error.message?.includes('API_KEY_INVALID')) {
        this.lastError = 'Invalid API key';
      } else if (error.message?.includes('PERMISSION_DENIED')) {
        this.lastError = 'API key does not have required permissions';
      } else {
        this.lastError = 'Failed to validate API key';
      }
      
      return false;
    }
  }

  /**
   * Break down a task into 3 micro-steps using Gemini API
   */
  async breakdownTask(description: string): Promise<MicroStep[]> {
    try {
      if (!this.apiKey) {
        await this.loadApiKey();
      }

      if (!this.apiKey || !this.genAI) {
        throw new Error('No API key configured. Please set your Gemini API key in settings.');
      }

      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `You are a productivity assistant. Break down this task into exactly 3 micro-steps.
Each step should be completable in 15-30 minutes and be highly specific.

Task: ${description}

Respond in JSON format:
{
  "steps": [
    {"step": 1, "description": "...", "estimatedMinutes": 20},
    {"step": 2, "description": "...", "estimatedMinutes": 25},
    {"step": 3, "description": "...", "estimatedMinutes": 15}
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length !== 3) {
        throw new Error('AI response does not contain exactly 3 steps');
      }

      // Validate and return micro-steps
      const microSteps: MicroStep[] = parsed.steps.map((step: any, index: number) => ({
        step: index + 1,
        description: step.description || '',
        estimatedMinutes: step.estimatedMinutes || 20
      }));

      // Validate each micro-step is minimum 5 characters (Requirement 25.5)
      const invalidSteps = microSteps.filter(step => step.description.trim().length < 5);
      if (invalidSteps.length > 0) {
        throw new Error('AI generated micro-steps that are too short. Please try again.');
      }

      this.lastError = null;
      return microSteps;
    } catch (error: any) {
      console.error('Task breakdown failed:', error);

      if (error.message?.includes('API_KEY_INVALID')) {
        this.lastError = 'Invalid API key';
        throw new Error('Invalid API key. Please check your Gemini API key in settings.');
      } else if (error.message?.includes('RATE_LIMIT')) {
        this.lastError = 'Rate limit exceeded';
        throw new Error('API rate limit reached. Please try again in a few moments.');
      } else if (error.message?.includes('No API key')) {
        this.lastError = error.message;
        throw error;
      } else if (error.message?.includes('Failed to parse')) {
        this.lastError = 'Failed to parse AI response';
        throw new Error('Failed to parse AI response. Please try again.');
      } else if (error.message?.includes('AI generated micro-steps that are too short')) {
        this.lastError = error.message;
        throw error;
      } else if (error.message?.includes('AI response does not contain exactly 3 steps')) {
        this.lastError = error.message;
        throw error;
      } else {
        this.lastError = 'Network error or timeout';
        throw new Error('Failed to connect to AI service. Please check your internet connection.');
      }
    }
  }

  /**
   * Get the last error message
   */
  getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Mask API key for display (show only last 4 characters)
   */
  async getMaskedApiKey(): Promise<string | null> {
    try {
      const key = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
      if (!key) return null;
      
      if (key.length <= 4) return '****';
      return '****' + key.slice(-4);
    } catch (error) {
      console.error('Failed to get masked API key:', error);
      return null;
    }
  }

  /**
   * Check if API key is configured
   */
  async hasApiKey(): Promise<boolean> {
    try {
      const key = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
      return key !== null;
    } catch (error) {
      console.error('Failed to check API key:', error);
      return false;
    }
  }
}

// Singleton instance
export const aiEngine = new AIEngine();
