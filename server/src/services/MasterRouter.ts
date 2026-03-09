import { CacheService } from './cacheService';
import { config } from '../config';

export type AgentIntent = 'life_admin' | 'wellness' | 'finance' | 'career' | 'project' | 'market';

export interface IntentClassificationResult {
  intent: AgentIntent;
  confidence: number;
  reasoning?: string;
}

/**
 * Master Router Service
 * - Classifies user intent using Gemini API
 * - Routes to appropriate specialized agent
 * - Defaults to life_admin (OPERATOR) if classification fails
 * 
 * Requirements: 40.1, 40.2, 40.3, 40.10
 */
export class MasterRouter {
  /**
   * Classify user input intent using Gemini API
   * 
   * @param input - Natural language text input from user
   * @returns Intent classification result
   * 
   * Requirements: 40.1, 40.2, 40.3
   */
  static async classifyIntent(input: string): Promise<IntentClassificationResult> {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = `intent:${input}`;
      const cached = await CacheService.getCachedGeminiResponse<IntentClassificationResult>(cacheKey);
      
      if (cached) {
        console.log('✅ Intent classification served from cache');
        return cached;
      }

      // Call Gemini API for intent classification
      const result = await this.callGeminiForIntentClassification(input);

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Intent classification error:', error);
      
      // Default to life_admin (OPERATOR) if classification fails
      // Requirement: 40.10
      return {
        intent: 'life_admin',
        confidence: 0,
        reasoning: 'Classification failed, defaulting to OPERATOR',
      };
    }
  }

  /**
   * Call Gemini API to classify intent
   * 
   * @param input - User input text
   * @returns Intent classification result
   */
  private static async callGeminiForIntentClassification(
    input: string
  ): Promise<IntentClassificationResult> {
    const apiKey = config.gemini.apiKey;
    
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct the prompt for intent classification
    const prompt = this.buildIntentClassificationPrompt(input);

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent classification
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    
    // Extract the generated text
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    // Parse the JSON response
    return this.parseIntentClassificationResponse(generatedText);
  }

  /**
   * Build the prompt for intent classification
   * 
   * @param input - User input text
   * @returns Formatted prompt for Gemini API
   */
  private static buildIntentClassificationPrompt(input: string): string {
    return `You are an intent classifier for a productivity app with 6 specialized AI agents.

Classify the following user input into ONE of these categories:

1. **life_admin** - Calendar management, deadlines, scheduling, time blocking, academic tasks, exam preparation
2. **wellness** - Health monitoring, sleep tracking, hydration, workout, diet, physical wellness
3. **finance** - Money management, budgeting, expenses, income tracking, financial planning (BDT currency)
4. **career** - Job search, resume building, skill development, learning paths, career planning
5. **project** - Project tracking, build accountability, GitHub integration, deployment tracking
6. **market** - Job market intelligence, salary research, opportunity discovery, industry trends

User Input: "${input}"

Respond ONLY with valid JSON in this exact format:
{
  "intent": "life_admin" | "wellness" | "finance" | "career" | "project" | "market",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
  }

  /**
   * Parse Gemini API response to extract intent classification
   * 
   * @param responseText - Raw text response from Gemini API
   * @returns Parsed intent classification result
   */
  private static parseIntentClassificationResponse(responseText: string): IntentClassificationResult {
    try {
      // Remove markdown code blocks if present
      let cleanedText = responseText.trim();
      
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
      }
      
      cleanedText = cleanedText.trim();

      // Parse JSON
      const parsed = JSON.parse(cleanedText);

      // Validate intent
      const validIntents: AgentIntent[] = [
        'life_admin',
        'wellness',
        'finance',
        'career',
        'project',
        'market',
      ];

      if (!validIntents.includes(parsed.intent)) {
        throw new Error(`Invalid intent: ${parsed.intent}`);
      }

      return {
        intent: parsed.intent as AgentIntent,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '',
      };
    } catch (error) {
      console.error('Failed to parse intent classification response:', error);
      console.error('Response text:', responseText);
      
      // Default to life_admin if parsing fails
      return {
        intent: 'life_admin',
        confidence: 0,
        reasoning: 'Failed to parse classification response',
      };
    }
  }

  /**
   * Get the agent name for a given intent
   * 
   * @param intent - Classified intent
   * @returns Agent name
   * 
   * Requirements: 40.4, 40.5, 40.6, 40.7, 40.8, 40.9
   */
  static getAgentForIntent(intent: AgentIntent): string {
    const agentMap: Record<AgentIntent, string> = {
      life_admin: 'OPERATOR',
      wellness: 'SENTINEL',
      finance: 'BROKER',
      career: 'ARCHITECT',
      project: 'FORGE',
      market: 'SIGNAL',
    };

    return agentMap[intent];
  }
}
