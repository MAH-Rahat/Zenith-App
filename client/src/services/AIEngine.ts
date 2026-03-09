import { GoogleGenerativeAI } from '@google/generative-ai';
import * as SecureStore from 'expo-secure-store';
import { DatabaseManager } from './DatabaseManager';

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export interface MicroStep {
  step: number;
  description: string;
  estimatedMinutes: number;
}

export interface GeminiCallOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  useWebSearch?: boolean;
}

export class AIEngine {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  private lastError: string | null = null;
  private dbManager: DatabaseManager;

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  /**
   * Set and store API key securely in settings table
   * Requirements: 60.3, 60.4
   */
  async setApiKey(key: string): Promise<void> {
    try {
      // Store in SecureStore for immediate access
      await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key);
      
      // Store in settings table for persistence (Requirement 60.3)
      await this.dbManager.upsertSetting('gemini_api_key', key);
      
      this.apiKey = key;
      this.genAI = new GoogleGenerativeAI(key);
      this.lastError = null;
      console.log('✅ API key set successfully');
    } catch (error) {
      console.error('❌ Failed to set API key:', error);
      throw new Error('Failed to store API key securely');
    }
  }

  /**
   * Load API key from settings table or SecureStore
   * Requirement: 60.3
   */
  private async loadApiKey(): Promise<string | null> {
    try {
      // Try loading from settings table first (Requirement 60.3)
      const settingKey = await this.dbManager.getSetting('gemini_api_key');
      
      if (settingKey) {
        this.apiKey = settingKey;
        this.genAI = new GoogleGenerativeAI(settingKey);
        
        // Sync to SecureStore for consistency
        await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, settingKey);
        
        return settingKey;
      }
      
      // Fallback to SecureStore
      const key = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
      if (key) {
        this.apiKey = key;
        this.genAI = new GoogleGenerativeAI(key);
        
        // Sync to settings table
        await this.dbManager.upsertSetting('gemini_api_key', key);
      }
      return key;
    } catch (error) {
      console.error('❌ Failed to load API key:', error);
      return null;
    }
  }

  /**
   * Validate API key by making a test request
   * Requirement: 60.5
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

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const result = await model.generateContent('Test');
      
      if (result.response) {
        this.lastError = null;
        console.log('✅ API key validated successfully');
        return true;
      }

      this.lastError = 'Invalid API response';
      return false;
    } catch (error: any) {
      console.error('❌ API key validation failed:', error);
      
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
   * Generic method to call Gemini API with exponential backoff
   * Requirements: 60.1, 60.2, 60.6, 60.7
   */
  async callGemini(options: GeminiCallOptions): Promise<string> {
    const {
      prompt,
      maxTokens = 1500,
      temperature = 0.7,
      useWebSearch = false,
    } = options;

    try {
      if (!this.apiKey) {
        await this.loadApiKey();
      }

      if (!this.apiKey || !this.genAI) {
        const error = new Error('No API key configured. Please set your Gemini API key in settings.');
        this.lastError = error.message;
        console.error('❌', error.message);
        throw error;
      }

      // Call with exponential backoff (Requirement 60.7)
      const response = await this.callWithRetry(prompt, maxTokens, temperature, useWebSearch);
      
      this.lastError = null;
      return response;
    } catch (error: any) {
      console.error('❌ Gemini API call failed:', error);
      
      // Display error message and log failure (Requirement 60.6)
      if (error.message?.includes('API_KEY_INVALID')) {
        this.lastError = 'Invalid API key';
        throw new Error('Invalid API key. Please check your Gemini API key in settings.');
      } else if (error.message?.includes('RATE_LIMIT')) {
        this.lastError = 'Rate limit exceeded';
        throw new Error('API rate limit reached. Please try again in a few moments.');
      } else if (error.message?.includes('No API key')) {
        this.lastError = error.message;
        throw error;
      } else {
        this.lastError = 'Network error or timeout';
        throw new Error('Failed to connect to AI service. Please check your internet connection.');
      }
    }
  }

  /**
   * Call Gemini API with exponential backoff retry logic
   * Requirement: 60.7
   */
  private async callWithRetry(
    prompt: string,
    maxTokens: number,
    temperature: number,
    useWebSearch: boolean,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const model = this.genAI!.getGenerativeModel({ 
          model: 'gemini-1.5-pro',
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature,
          },
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        if (!text) {
          throw new Error('Empty response from Gemini API');
        }

        console.log(`✅ Gemini API call successful (attempt ${attempt + 1})`);
        return text;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Gemini API attempt ${attempt + 1} failed:`, error.message);

        // Don't retry on authentication errors
        if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('PERMISSION_DENIED')) {
          throw error;
        }

        // Exponential backoff: wait 2^attempt seconds (Requirement 60.7)
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // Log failure after all retries (Requirement 60.6)
    console.error('❌ Gemini API failed after all retries');
    throw lastError || new Error('Gemini API failed after retries');
  }

  /**
   * Break down a task into 3 micro-steps using Gemini API
   * Requirements: 60.1, 60.2 (Fog Mode integration)
   */
  async breakdownTask(description: string): Promise<MicroStep[]> {
    try {
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

      // Use the generic callGemini method
      const text = await this.callGemini({
        prompt,
        maxTokens: 500,
        temperature: 0.7,
      });

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

      console.log('✅ Task breakdown successful');
      return microSteps;
    } catch (error: any) {
      console.error('❌ Task breakdown failed:', error);

      // Re-throw with user-friendly messages
      if (error.message?.includes('No API key')) {
        throw error;
      } else if (error.message?.includes('Failed to parse')) {
        throw new Error('Failed to parse AI response. Please try again.');
      } else if (error.message?.includes('AI generated micro-steps that are too short')) {
        throw error;
      } else if (error.message?.includes('AI response does not contain exactly 3 steps')) {
        throw error;
      } else if (error.message?.includes('Invalid API key')) {
        throw error;
      } else if (error.message?.includes('Rate limit')) {
        throw error;
      } else {
        throw new Error('Failed to break down task. Please try again.');
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
