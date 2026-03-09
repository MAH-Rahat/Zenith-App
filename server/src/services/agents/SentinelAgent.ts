import { config } from '../../config';
import { CacheService } from '../cacheService';
import { Notification } from '../../models/Notification';
import mongoose from 'mongoose';

/**
 * SENTINEL Agent - Wellness Enforcement
 * 
 * Persona: Ruthless drill instructor with weaponized sarcasm
 * 
 * Responsibilities:
 * - Health score calculation using weighted formula
 * - Trigger rule evaluation (CRITICAL and WARNING)
 * - Persona enforcement (harsh when health_score < 85, neutral when >= 85)
 * - Push notification generation for CRITICAL triggers
 * - Cognitive risk warnings for sleep deprivation
 * 
 * Requirements: 43.1-43.8, 44.1-44.5, 45.1-45.5, 81.1-81.4, 64.2, 64.4
 */

// ===== Input/Output Interfaces =====

export interface SentinelInput {
  userId: string;
  sleepHours: number;
  hydrationML: number;
  workoutCompleted: boolean;
  dietQuality: 'clean' | 'junk';
  consecutiveSedentaryDays: number;
}

export interface TriggerRules {
  CRITICAL: {
    sleep_lt_5: boolean;
    junk_food: boolean;
  };
  WARNING: {
    hydration_lt_1500: boolean;
    sedentary_2plus_days: boolean;
  };
}

export interface SentinelOutput {
  health_score: number;
  push_notification: string | null;
  daily_report: string;
  reprimand_triggered: boolean;
  cognitive_risk: string | null;
}

// ===== SENTINEL Agent Class =====

export class SentinelAgent {
  /**
   * Process SENTINEL agent request
   * 
   * Requirements: 43.1, 43.2, 43.3, 43.4, 43.5, 43.6, 43.7, 43.8
   */
  static async process(input: SentinelInput): Promise<SentinelOutput> {
    console.log('💪 SENTINEL processing wellness data...');

    // Calculate health score (Requirement 44.1)
    const healthScore = this.calculateHealthScore(input);

    // Evaluate trigger rules (Requirement 43.3)
    const triggers = this.evaluateTriggers(input);

    // Determine if reprimand is triggered
    const reprimandTriggered = 
      triggers.CRITICAL.sleep_lt_5 || 
      triggers.CRITICAL.junk_food ||
      triggers.WARNING.hydration_lt_1500 ||
      triggers.WARNING.sedentary_2plus_days;

    // Generate cognitive risk warning if sleep < 6 hours (Requirement 45.4)
    const cognitiveRisk = input.sleepHours < 6
      ? 'COGNITIVE IMPAIRMENT RISK: Sleep deprivation detected. Decision-making capacity compromised.'
      : null;

    // Generate daily report using Gemini API (Requirement 43.8)
    const dailyReport = await this.generateDailyReport(
      healthScore,
      triggers,
      input,
      cognitiveRisk
    );

    // Generate push notification for CRITICAL triggers (Requirement 43.4)
    const pushNotification = this.shouldSendPushNotification(triggers)
      ? await this.generatePushNotification(healthScore, triggers, input)
      : null;

    // Construct output (Requirement 43.7)
    const output: SentinelOutput = {
      health_score: healthScore,
      push_notification: pushNotification,
      daily_report: dailyReport,
      reprimand_triggered: reprimandTriggered,
      cognitive_risk: cognitiveRisk,
    };

    // Persist health score to user_profile (Requirement 44.3)
    await this.persistHealthScore(input.userId, healthScore);

    // Log WARNING triggers to notifications table (Requirement 43.5)
    if (triggers.WARNING.hydration_lt_1500 || triggers.WARNING.sedentary_2plus_days) {
      await this.logWarningNotification(input.userId, triggers, healthScore);
    }

    // Trigger WARNING notification if health_score < 50 (Requirement 44.5)
    if (healthScore < 50) {
      await this.triggerLowHealthWarning(input.userId, healthScore);
    }

    console.log('✅ SENTINEL processing complete');
    return output;
  }

  /**
   * Calculate health score using weighted formula
   * 
   * Requirements: 44.1
   * 
   * Formula:
   * - sleep: 30% weight (8 hours = 100%, <5 hours = 0%)
   * - hydration: 25% weight (2500ml = 100%, <1000ml = 0%)
   * - workout: 25% weight (daily = 100%, 0 in 7 days = 0%)
   * - diet: 20% weight (clean = 100%, junk = 0%)
   */
  private static calculateHealthScore(input: SentinelInput): number {
    const weights = {
      sleep: 0.30,
      hydration: 0.25,
      workout: 0.25,
      diet: 0.20,
    };

    // Sleep score (8 hours = 100%, <5 hours = 0%)
    const sleepScore = Math.max(0, Math.min(100, (input.sleepHours / 8) * 100));

    // Hydration score (2500ml = 100%, <1000ml = 0%)
    const hydrationScore = Math.max(
      0,
      Math.min(100, ((input.hydrationML - 1000) / 1500) * 100)
    );

    // Workout score (daily = 100%, 0 in 7 days = 0%)
    const workoutScore = input.workoutCompleted
      ? 100
      : Math.max(0, 100 - input.consecutiveSedentaryDays * 14.3);

    // Diet score (clean = 100%, junk = 0%)
    const dietScore = input.dietQuality === 'clean' ? 100 : 0;

    // Calculate weighted total
    const totalScore =
      sleepScore * weights.sleep +
      hydrationScore * weights.hydration +
      workoutScore * weights.workout +
      dietScore * weights.diet;

    return Math.round(totalScore);
  }

  /**
   * Evaluate trigger rules
   * 
   * Requirements: 43.3
   * 
   * CRITICAL triggers:
   * - sleep <5 hours
   * - junk food consumed
   * 
   * WARNING triggers:
   * - hydration <1500ml
   * - 2+ consecutive sedentary days
   */
  private static evaluateTriggers(input: SentinelInput): TriggerRules {
    return {
      CRITICAL: {
        sleep_lt_5: input.sleepHours < 5,
        junk_food: input.dietQuality === 'junk',
      },
      WARNING: {
        hydration_lt_1500: input.hydrationML < 1500,
        sedentary_2plus_days: input.consecutiveSedentaryDays >= 2,
      },
    };
  }

  /**
   * Determine if push notification should be sent
   * 
   * Requirements: 43.4
   */
  private static shouldSendPushNotification(triggers: TriggerRules): boolean {
    return triggers.CRITICAL.sleep_lt_5 || triggers.CRITICAL.junk_food;
  }

  /**
   * Generate daily report using Gemini API
   * 
   * Requirements: 43.8, 45.1, 45.2, 45.3, 45.4, 45.5, 81.1, 81.2, 81.3, 81.4
   */
  private static async generateDailyReport(
    healthScore: number,
    triggers: TriggerRules,
    input: SentinelInput,
    cognitiveRisk: string | null
  ): Promise<string> {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = `sentinel:report:${input.userId}:${healthScore}:${JSON.stringify(triggers)}`;
      const cached = await CacheService.getCachedGeminiResponse<string>(cacheKey);

      if (cached) {
        console.log('✅ Daily report served from cache');
        return cached;
      }

      // Call Gemini API
      const report = await this.callGeminiForDailyReport(
        healthScore,
        triggers,
        input,
        cognitiveRisk
      );

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, report);

      return report;
    } catch (error) {
      console.error('Failed to generate daily report:', error);

      // Return default report if Gemini fails
      return this.getDefaultDailyReport(healthScore, triggers, input, cognitiveRisk);
    }
  }

  /**
   * Generate push notification for CRITICAL triggers
   * 
   * Requirements: 43.4, 43.8, 45.1, 45.2, 81.1, 81.2, 81.3, 81.4
   */
  private static async generatePushNotification(
    healthScore: number,
    triggers: TriggerRules,
    input: SentinelInput
  ): Promise<string> {
    try {
      // Call Gemini API for harsh reprimand
      const notification = await this.callGeminiForPushNotification(
        healthScore,
        triggers,
        input
      );

      return notification;
    } catch (error) {
      console.error('Failed to generate push notification:', error);

      // Return default harsh notification if Gemini fails
      return this.getDefaultPushNotification(triggers);
    }
  }

  /**
   * Call Gemini API to generate daily report
   * 
   * Requirements: 43.8, 60.1
   */
  private static async callGeminiForDailyReport(
    healthScore: number,
    triggers: TriggerRules,
    input: SentinelInput,
    cognitiveRisk: string | null
  ): Promise<string> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt with persona enforcement (Requirements 45.1, 45.2, 45.3, 81.1, 81.2)
    const prompt = this.buildDailyReportPrompt(
      healthScore,
      triggers,
      input,
      cognitiveRisk
    );

    // Call Gemini API with exponential backoff
    const response = await this.callGeminiWithRetry(apiKey, prompt);

    return response.trim();
  }

  /**
   * Call Gemini API to generate push notification
   * 
   * Requirements: 43.8, 60.1
   */
  private static async callGeminiForPushNotification(
    healthScore: number,
    triggers: TriggerRules,
    input: SentinelInput
  ): Promise<string> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt for harsh reprimand (Requirements 45.1, 81.1, 81.2, 81.3, 81.4)
    const prompt = this.buildPushNotificationPrompt(healthScore, triggers, input);

    // Call Gemini API with exponential backoff
    const response = await this.callGeminiWithRetry(apiKey, prompt);

    return response.trim();
  }

  /**
   * Build prompt for daily report generation
   * 
   * Requirements: 43.1, 45.1, 45.2, 45.3, 45.4, 45.5, 81.1, 81.2, 81.3, 81.4
   */
  private static buildDailyReportPrompt(
    healthScore: number,
    triggers: TriggerRules,
    input: SentinelInput,
    cognitiveRisk: string | null
  ): string {
    // Determine tone based on health score (Requirements 45.1, 45.2, 81.1, 81.2)
    const tone = healthScore < 85 ? 'harsh_sarcastic' : 'neutral_professional';

    // Build trigger summary
    const triggerSummary = this.buildTriggerSummary(triggers);

    return `You are SENTINEL, a ruthless drill instructor with weaponized sarcasm. Your job is to enforce wellness with brutal honesty.

Health Score: ${healthScore}/100
Sleep: ${input.sleepHours} hours
Hydration: ${input.hydrationML}ml
Workout: ${input.workoutCompleted ? 'Completed' : 'Skipped'}
Diet: ${input.dietQuality}
Consecutive Sedentary Days: ${input.consecutiveSedentaryDays}

Triggers:
${triggerSummary}

${cognitiveRisk ? `COGNITIVE RISK: ${cognitiveRisk}` : ''}

Tone: ${tone}

${tone === 'harsh_sarcastic' ? `
CRITICAL INSTRUCTIONS:
- Use harsh, sarcastic tone (Requirement 45.1, 81.2)
- Include drill instructor phrases (Requirement 81.3)
- Reference consequences of poor health (Requirement 81.4)
- Reference graduation deadline pressure (Requirement 45.5)
- NEVER use kind or encouraging language (Requirements 45.3, 81.1)
- Be brutal and direct
` : `
INSTRUCTIONS:
- Use neutral, professional tone (Requirement 45.2)
- Provide factual health assessment
- No sarcasm or harshness
`}

Generate a daily wellness report in 3-4 sentences. Be direct and uncompromising.`;
  }

  /**
   * Build prompt for push notification generation
   * 
   * Requirements: 43.1, 43.4, 45.1, 81.1, 81.2, 81.3, 81.4
   */
  private static buildPushNotificationPrompt(
    healthScore: number,
    triggers: TriggerRules,
    input: SentinelInput
  ): string {
    const triggerSummary = this.buildTriggerSummary(triggers);

    return `You are SENTINEL, a ruthless drill instructor. Generate a HARSH push notification reprimand.

Health Score: ${healthScore}/100
Sleep: ${input.sleepHours} hours
Diet: ${input.dietQuality}

CRITICAL Triggers:
${triggerSummary}

REQUIREMENTS:
- Maximum 2 sentences
- Harsh, sarcastic tone (Requirements 45.1, 81.2)
- Include drill instructor phrase (Requirement 81.3)
- Reference consequences (Requirement 81.4)
- NEVER be kind or encouraging (Requirements 45.3, 81.1)

Generate the push notification text:`;
  }

  /**
   * Build trigger summary for prompts
   */
  private static buildTriggerSummary(triggers: TriggerRules): string {
    const lines: string[] = [];

    if (triggers.CRITICAL.sleep_lt_5) {
      lines.push('- CRITICAL: Sleep <5 hours');
    }
    if (triggers.CRITICAL.junk_food) {
      lines.push('- CRITICAL: Junk food consumed');
    }
    if (triggers.WARNING.hydration_lt_1500) {
      lines.push('- WARNING: Hydration <1500ml');
    }
    if (triggers.WARNING.sedentary_2plus_days) {
      lines.push('- WARNING: 2+ sedentary days');
    }

    return lines.length > 0 ? lines.join('\n') : 'No triggers';
  }

  /**
   * Call Gemini API with exponential backoff retry logic
   * 
   * Requirement: 60.7
   */
  private static async callGeminiWithRetry(
    apiKey: string,
    prompt: string,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
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
                temperature: 0.7, // Higher temperature for more varied sarcasm
                maxOutputTokens: 300,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data: any = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
          throw new Error('No response from Gemini API');
        }

        return generatedText;
      } catch (error) {
        lastError = error as Error;
        console.error(`Gemini API attempt ${attempt + 1} failed:`, error);

        // Exponential backoff: wait 2^attempt seconds
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('Gemini API failed after retries');
  }

  /**
   * Get default daily report when Gemini fails
   */
  private static getDefaultDailyReport(
    healthScore: number,
    triggers: TriggerRules,
    input: SentinelInput,
    cognitiveRisk: string | null
  ): string {
    const tone = healthScore < 85 ? 'harsh' : 'neutral';

    if (tone === 'harsh') {
      let report = `Health score: ${healthScore}/100. Pathetic. `;

      if (triggers.CRITICAL.sleep_lt_5) {
        report += `${input.sleepHours} hours of sleep? Your brain is operating at half capacity. `;
      }

      if (triggers.CRITICAL.junk_food) {
        report += `Junk food? You're sabotaging your own graduation. `;
      }

      if (triggers.WARNING.hydration_lt_1500) {
        report += `${input.hydrationML}ml hydration is amateur hour. `;
      }

      if (triggers.WARNING.sedentary_2plus_days) {
        report += `${input.consecutiveSedentaryDays} sedentary days. Your body is deteriorating. `;
      }

      if (cognitiveRisk) {
        report += cognitiveRisk;
      }

      return report.trim();
    } else {
      return `Health score: ${healthScore}/100. Wellness metrics within acceptable range. Sleep: ${input.sleepHours}h, Hydration: ${input.hydrationML}ml, Workout: ${input.workoutCompleted ? 'completed' : 'skipped'}, Diet: ${input.dietQuality}.`;
    }
  }

  /**
   * Get default push notification when Gemini fails
   */
  private static getDefaultPushNotification(triggers: TriggerRules): string {
    if (triggers.CRITICAL.sleep_lt_5) {
      return 'SENTINEL ALERT: Sleep deprivation detected. Your cognitive performance is compromised. Fix this now.';
    }

    if (triggers.CRITICAL.junk_food) {
      return 'SENTINEL ALERT: Junk food consumed. You\'re sabotaging your health and graduation timeline. Unacceptable.';
    }

    return 'SENTINEL ALERT: Critical wellness violation detected. Immediate correction required.';
  }

  /**
   * Persist health score to user_profile table
   * 
   * Requirements: 44.3
   */
  private static async persistHealthScore(
    userId: string,
    healthScore: number
  ): Promise<void> {
    try {
      const { UserProfile } = await import('../../models/UserProfile');

      await UserProfile.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            health_score: healthScore,
            health_score_updated_at: new Date(),
          },
        },
        { upsert: true }
      );

      console.log(`✅ Health score ${healthScore} persisted for user ${userId}`);
    } catch (error) {
      console.error('Failed to persist health score:', error);
      // Don't throw - persistence failure shouldn't break the agent
    }
  }

  /**
   * Log WARNING triggers to notifications table
   * 
   * Requirements: 43.5
   */
  private static async logWarningNotification(
    userId: string,
    triggers: TriggerRules,
    healthScore: number
  ): Promise<void> {
    try {
      const warnings: string[] = [];

      if (triggers.WARNING.hydration_lt_1500) {
        warnings.push('Hydration below 1500ml');
      }

      if (triggers.WARNING.sedentary_2plus_days) {
        warnings.push('2+ consecutive sedentary days');
      }

      if (warnings.length > 0) {
        await Notification.create({
          userId: new mongoose.Types.ObjectId(userId),
          type: 'sentinel',
          title: 'SENTINEL: Wellness Warning',
          message: `Health score: ${healthScore}/100. Warnings: ${warnings.join(', ')}`,
          data: { triggers, healthScore },
          isRead: false,
          timestamp: new Date(),
        });

        console.log('✅ WARNING notification logged');
      }
    } catch (error) {
      console.error('Failed to log WARNING notification:', error);
      // Don't throw - notification logging failure shouldn't break the agent
    }
  }

  /**
   * Trigger WARNING notification when health_score < 50
   * 
   * Requirements: 44.5
   */
  private static async triggerLowHealthWarning(
    userId: string,
    healthScore: number
  ): Promise<void> {
    try {
      await Notification.create({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'sentinel',
        title: 'SENTINEL: CRITICAL HEALTH ALERT',
        message: `Health score dropped to ${healthScore}/100. Immediate wellness intervention required.`,
        data: { healthScore, severity: 'CRITICAL' },
        isRead: false,
        timestamp: new Date(),
      });

      console.log('✅ Low health WARNING notification triggered');
    } catch (error) {
      console.error('Failed to trigger low health warning:', error);
      // Don't throw - notification failure shouldn't break the agent
    }
  }
}
