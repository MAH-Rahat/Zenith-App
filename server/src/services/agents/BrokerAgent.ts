import { config } from '../../config';
import { CacheService } from '../cacheService';
import { Notification } from '../../models/Notification';
import mongoose from 'mongoose';

/**
 * BROKER Agent - Financial Intelligence
 * 
 * Persona: Quantitative analyst, emotionless, precision-obsessed
 * 
 * Responsibilities:
 * - Track income sources (tutoring, freelance) in BDT
 * - Track expenses by category
 * - Calculate burn_rate_bdt (monthly expenses)
 * - Calculate runway_days (balance / daily burn rate)
 * - Calculate savings_rate_percent
 * - Integrate Exchange Rate API for BDT → USD/EUR conversion (cache 6 hours)
 * - Implement spending alerts when monthly spending exceeds 85% of income
 * - BDT-first formatting with ৳ symbol
 * 
 * Requirements: 46.1-46.9, 47.1-47.5, 48.1-48.5, 80.1-80.4, 64.2, 64.4
 */

// ===== Input/Output Interfaces =====

export interface IncomeSource {
  source: 'tutoring' | 'freelance';
  amount_bdt: number;
  date: string; // ISO 8601 format
}

export interface Expense {
  category: string;
  amount_bdt: number;
  date: string; // ISO 8601 format
  description?: string;
}

export interface BrokerInput {
  userId: string;
  userInput: string;
  balance_bdt: number;
  income_sources: IncomeSource[];
  expenses: Expense[];
}

export interface ExchangeRates {
  BDT_USD: number;
  BDT_EUR: number;
  cached_at: string;
  is_stale: boolean;
}

export interface SpendingBreakdown {
  category: string;
  amount_bdt: number;
  percentage: number;
}

export interface BrokerOutput {
  balance_bdt: number;
  monthly_income_bdt: number;
  burn_rate_bdt: number;
  runway_days: number;
  savings_rate_percent: number;
  fx_rates: ExchangeRates;
  alert: string | null;
  spending_breakdown: SpendingBreakdown[];
  recommendations: string[];
}

// ===== Exchange Rate API Response =====

interface ExchangeRateApiResponse {
  result: string;
  conversion_rates?: {
    USD?: number;
    EUR?: number;
  };
  time_last_update_utc?: string;
}

// ===== BROKER Agent Class =====

export class BrokerAgent {
  /**
   * Process BROKER agent request
   * 
   * Requirements: 46.1, 46.2, 46.3, 46.4, 46.5, 46.6, 46.7, 46.8, 46.9
   */
  static async process(input: BrokerInput): Promise<BrokerOutput> {
    console.log('💰 BROKER processing financial data...');

    // Calculate monthly income from sources (Requirement 46.3)
    const monthlyIncomeBDT = this.calculateMonthlyIncome(input.income_sources);

    // Calculate burn rate (monthly expenses) (Requirement 46.5)
    const burnRateBDT = this.calculateBurnRate(input.expenses);

    // Calculate runway days (Requirement 46.6)
    const runwayDays = this.calculateRunwayDays(input.balance_bdt, burnRateBDT);

    // Calculate savings rate percentage (Requirement 46.7)
    const savingsRatePercent = this.calculateSavingsRate(monthlyIncomeBDT, burnRateBDT);

    // Get spending breakdown by category (Requirement 46.4)
    const spendingBreakdown = this.calculateSpendingBreakdown(input.expenses);

    // Fetch exchange rates (Requirements 47.1, 47.2, 47.3, 47.4, 47.5)
    const fxRates = await this.getExchangeRates();

    // Check for spending alerts (Requirements 48.1, 48.2, 48.3, 48.4, 48.5)
    const alert = this.checkSpendingAlert(
      burnRateBDT,
      monthlyIncomeBDT,
      runwayDays,
      spendingBreakdown
    );

    // Generate recommendations using Gemini API (Requirement 46.9)
    const recommendations = await this.generateRecommendations(
      input.userInput,
      monthlyIncomeBDT,
      burnRateBDT,
      savingsRatePercent,
      spendingBreakdown
    );

    // Construct output (Requirement 46.8)
    const output: BrokerOutput = {
      balance_bdt: input.balance_bdt,
      monthly_income_bdt: monthlyIncomeBDT,
      burn_rate_bdt: burnRateBDT,
      runway_days: runwayDays,
      savings_rate_percent: savingsRatePercent,
      fx_rates: fxRates,
      alert,
      spending_breakdown: spendingBreakdown,
      recommendations,
    };

    // Send push notification if alert triggered (Requirement 48.3)
    if (alert) {
      await this.sendSpendingAlert(input.userId, alert, output);
    }

    console.log('✅ BROKER processing complete');
    return output;
  }

  /**
   * Calculate monthly income from income sources
   * 
   * Requirement: 46.3
   */
  private static calculateMonthlyIncome(incomeSources: IncomeSource[]): number {
    // Get income from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentIncome = incomeSources.filter(source => {
      const sourceDate = new Date(source.date);
      return sourceDate >= thirtyDaysAgo;
    });

    const totalIncome = recentIncome.reduce((sum, source) => sum + source.amount_bdt, 0);

    return Math.round(totalIncome);
  }

  /**
   * Calculate burn rate (monthly expenses)
   * 
   * Requirement: 46.5
   */
  private static calculateBurnRate(expenses: Expense[]): number {
    // Get expenses from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= thirtyDaysAgo;
    });

    const totalExpenses = recentExpenses.reduce((sum, expense) => sum + expense.amount_bdt, 0);

    return Math.round(totalExpenses);
  }

  /**
   * Calculate runway days
   * 
   * Requirement: 46.6
   * Formula: balance_bdt / (burn_rate_bdt / 30)
   */
  private static calculateRunwayDays(balanceBDT: number, burnRateBDT: number): number {
    if (burnRateBDT === 0) {
      return Infinity;
    }

    const dailyBurnRate = burnRateBDT / 30;
    const runwayDays = balanceBDT / dailyBurnRate;

    return Math.round(runwayDays);
  }

  /**
   * Calculate savings rate percentage
   * 
   * Requirement: 46.7
   * Formula: (monthly_income_bdt - burn_rate_bdt) / monthly_income_bdt * 100
   */
  private static calculateSavingsRate(monthlyIncomeBDT: number, burnRateBDT: number): number {
    if (monthlyIncomeBDT === 0) {
      return 0;
    }

    const savingsRate = ((monthlyIncomeBDT - burnRateBDT) / monthlyIncomeBDT) * 100;

    return Math.round(savingsRate * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Calculate spending breakdown by category
   * 
   * Requirement: 46.4
   */
  private static calculateSpendingBreakdown(expenses: Expense[]): SpendingBreakdown[] {
    // Get expenses from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= thirtyDaysAgo;
    });

    // Group by category
    const categoryTotals = new Map<string, number>();

    for (const expense of recentExpenses) {
      const current = categoryTotals.get(expense.category) || 0;
      categoryTotals.set(expense.category, current + expense.amount_bdt);
    }

    // Calculate total for percentages
    const totalExpenses = recentExpenses.reduce((sum, expense) => sum + expense.amount_bdt, 0);

    // Convert to breakdown array
    const breakdown: SpendingBreakdown[] = [];

    for (const [category, amount] of categoryTotals.entries()) {
      breakdown.push({
        category,
        amount_bdt: Math.round(amount),
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100 * 10) / 10 : 0,
      });
    }

    // Sort by amount descending
    breakdown.sort((a, b) => b.amount_bdt - a.amount_bdt);

    return breakdown;
  }

  /**
   * Get exchange rates for BDT → USD and BDT → EUR
   * 
   * Requirements: 47.1, 47.2, 47.3, 47.4, 47.5
   */
  private static async getExchangeRates(): Promise<ExchangeRates> {
    try {
      // Check cache first (6 hours TTL) - Requirement 47.2
      const cacheKey = 'BDT_rates';
      const cached = await CacheService.getCachedExchangeRate<ExchangeRates>(cacheKey);

      if (cached) {
        console.log('✅ Exchange rates served from cache');
        
        // Check if cache is stale (older than 6 hours)
        const cachedAt = new Date(cached.cached_at);
        const now = new Date();
        const hoursSinceCached = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
        
        cached.is_stale = hoursSinceCached > 6;
        
        return cached;
      }

      // Cache miss - call Exchange Rate API (Requirement 47.1)
      console.log('🔄 Calling Exchange Rate API...');
      const rates = await this.fetchExchangeRatesFromApi();

      // Cache the result (Requirement 47.2)
      await CacheService.cacheExchangeRate(cacheKey, rates);

      return rates;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);

      // Try to use cached rates even if stale (Requirement 47.5)
      const cacheKey = 'BDT_rates';
      const staleCache = await CacheService.getCachedExchangeRate<ExchangeRates>(cacheKey);

      if (staleCache) {
        console.log('⚠️ Using stale cached exchange rates');
        staleCache.is_stale = true;
        return staleCache;
      }

      // Return mock rates if all else fails
      return this.getMockExchangeRates();
    }
  }

  /**
   * Fetch exchange rates from Exchange Rate API
   * 
   * Requirement: 47.1
   * 
   * Using exchangerate-api.com free tier
   * Endpoint: https://v6.exchangerate-api.com/v6/{API_KEY}/latest/BDT
   */
  private static async fetchExchangeRatesFromApi(): Promise<ExchangeRates> {
    const apiKey = config.exchangeRate?.apiKey || 'mock';

    // If no API key configured, return mock rates
    if (apiKey === 'mock' || !apiKey) {
      console.log('⚠️ No Exchange Rate API key configured, using mock rates');
      return this.getMockExchangeRates();
    }

    try {
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/BDT`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Exchange Rate API error: ${response.status}`);
      }

      const data: ExchangeRateApiResponse = await response.json() as ExchangeRateApiResponse;

      if (data.result !== 'success' || !data.conversion_rates) {
        throw new Error('Invalid Exchange Rate API response');
      }

      const rates: ExchangeRates = {
        BDT_USD: data.conversion_rates.USD || 0.0091, // Fallback to approximate rate
        BDT_EUR: data.conversion_rates.EUR || 0.0084, // Fallback to approximate rate
        cached_at: new Date().toISOString(),
        is_stale: false,
      };

      return rates;
    } catch (error) {
      console.error('Exchange Rate API call failed:', error);
      throw error;
    }
  }

  /**
   * Get mock exchange rates (fallback)
   * 
   * Approximate rates as of 2024:
   * - 1 BDT ≈ 0.0091 USD
   * - 1 BDT ≈ 0.0084 EUR
   */
  private static getMockExchangeRates(): ExchangeRates {
    return {
      BDT_USD: 0.0091,
      BDT_EUR: 0.0084,
      cached_at: new Date().toISOString(),
      is_stale: false,
    };
  }

  /**
   * Check for spending alerts
   * 
   * Requirements: 48.1, 48.2, 48.4, 48.5
   */
  private static checkSpendingAlert(
    burnRateBDT: number,
    monthlyIncomeBDT: number,
    runwayDays: number,
    spendingBreakdown: SpendingBreakdown[]
  ): string | null {
    // Check if monthly spending exceeds 85% of income (Requirement 48.1)
    if (monthlyIncomeBDT === 0) {
      return null;
    }

    const spendingPercentage = (burnRateBDT / monthlyIncomeBDT) * 100;

    if (spendingPercentage >= 85) {
      // Generate alert message (Requirements 48.2, 48.4, 48.5)
      const topCategories = spendingBreakdown.slice(0, 3).map(s => s.category);
      
      let alert = `ALERT: Monthly spending at ${Math.round(spendingPercentage)}% of income. `;
      alert += `Burn rate: ৳${this.formatBDT(burnRateBDT)}/month. `;
      alert += `Runway: ${runwayDays} days. `;
      
      if (topCategories.length > 0) {
        alert += `Consider reducing: ${topCategories.join(', ')}.`;
      }

      return alert;
    }

    return null;
  }

  /**
   * Send spending alert notification
   * 
   * Requirement: 48.3
   */
  private static async sendSpendingAlert(
    userId: string,
    alert: string,
    output: BrokerOutput
  ): Promise<void> {
    try {
      await Notification.create({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'broker',
        title: 'BROKER: Spending Alert',
        message: alert,
        data: output,
        isRead: false,
        timestamp: new Date(),
      });

      console.log('✅ Spending alert notification sent');
    } catch (error) {
      console.error('Failed to send spending alert:', error);
      // Don't throw - notification failure shouldn't break the agent
    }
  }

  /**
   * Generate financial recommendations using Gemini API
   * 
   * Requirement: 46.9
   */
  private static async generateRecommendations(
    userInput: string,
    monthlyIncomeBDT: number,
    burnRateBDT: number,
    savingsRatePercent: number,
    spendingBreakdown: SpendingBreakdown[]
  ): Promise<string[]> {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = `broker:recommendations:${userInput}:${monthlyIncomeBDT}:${burnRateBDT}`;
      const cached = await CacheService.getCachedGeminiResponse<string[]>(cacheKey);

      if (cached) {
        console.log('✅ Recommendations served from cache');
        return cached;
      }

      // Call Gemini API
      const recommendations = await this.callGeminiForRecommendations(
        userInput,
        monthlyIncomeBDT,
        burnRateBDT,
        savingsRatePercent,
        spendingBreakdown
      );

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, recommendations);

      return recommendations;
    } catch (error) {
      console.error('Failed to generate recommendations:', error);

      // Return default recommendations if Gemini fails
      return this.getDefaultRecommendations(savingsRatePercent, spendingBreakdown);
    }
  }

  /**
   * Call Gemini API to generate financial recommendations
   * 
   * Requirements: 46.9, 60.1
   */
  private static async callGeminiForRecommendations(
    userInput: string,
    monthlyIncomeBDT: number,
    burnRateBDT: number,
    savingsRatePercent: number,
    spendingBreakdown: SpendingBreakdown[]
  ): Promise<string[]> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt with quantitative analyst persona (Requirement 46.1)
    const prompt = this.buildRecommendationsPrompt(
      userInput,
      monthlyIncomeBDT,
      burnRateBDT,
      savingsRatePercent,
      spendingBreakdown
    );

    // Call Gemini API with exponential backoff
    const response = await this.callGeminiWithRetry(apiKey, prompt);

    // Parse response
    return this.parseRecommendationsResponse(response);
  }

  /**
   * Build prompt for recommendations generation
   * 
   * Requirements: 46.1, 80.1, 80.2, 80.3, 80.4
   */
  private static buildRecommendationsPrompt(
    userInput: string,
    monthlyIncomeBDT: number,
    burnRateBDT: number,
    savingsRatePercent: number,
    spendingBreakdown: SpendingBreakdown[]
  ): string {
    return `You are BROKER, a quantitative analyst with zero emotion and obsessive precision. Your job is to analyze financial data and provide data-driven recommendations.

User Input: "${userInput}"

Financial Data (BDT - Bangladeshi Taka):
- Monthly Income: ৳${this.formatBDT(monthlyIncomeBDT)}
- Monthly Burn Rate: ৳${this.formatBDT(burnRateBDT)}
- Savings Rate: ${savingsRatePercent}%

Spending Breakdown:
${spendingBreakdown.map(s => `- ${s.category}: ৳${this.formatBDT(s.amount_bdt)} (${s.percentage}%)`).join('\n')}

REQUIREMENTS (Requirements 46.1, 80.1, 80.2, 80.3, 80.4):
- Use emotionless, precision-obsessed tone
- Display all amounts in BDT first (৳ symbol)
- Provide exactly 3 actionable recommendations
- Be direct and data-driven
- No pleasantries or encouragement

Format:
{
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2",
    "Recommendation 3"
  ]
}`;
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
                temperature: 0.3, // Low temperature for precision
                maxOutputTokens: 500,
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
   * Parse Gemini API response to extract recommendations
   */
  private static parseRecommendationsResponse(responseText: string): string[] {
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

      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Invalid response format');
      }

      // Return up to 3 recommendations
      return parsed.recommendations.slice(0, 3);
    } catch (error) {
      console.error('Failed to parse recommendations response:', error);
      console.error('Response text:', responseText);

      // Return empty array if parsing fails
      return [];
    }
  }

  /**
   * Get default recommendations when Gemini fails
   */
  private static getDefaultRecommendations(
    savingsRatePercent: number,
    spendingBreakdown: SpendingBreakdown[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommendation based on savings rate
    if (savingsRatePercent < 20) {
      recommendations.push(`Savings rate at ${savingsRatePercent}%. Target minimum 20% for financial stability.`);
    } else {
      recommendations.push(`Savings rate at ${savingsRatePercent}%. Maintain current trajectory.`);
    }

    // Recommendation based on top spending category
    if (spendingBreakdown.length > 0) {
      const topCategory = spendingBreakdown[0];
      recommendations.push(`${topCategory.category} accounts for ${topCategory.percentage}% of spending. Analyze for optimization opportunities.`);
    }

    // Generic recommendation
    recommendations.push('Track daily expenses to identify micro-spending patterns.');

    return recommendations.slice(0, 3);
  }

  /**
   * Format BDT amount with Bangladeshi number formatting
   * 
   * Requirements: 80.3, 80.4
   * 
   * Example: 100000 → 1,00,000
   */
  private static formatBDT(amount: number): string {
    const amountStr = Math.round(amount).toString();
    
    // Bangladeshi number formatting: groups of 2 digits after first 3
    if (amountStr.length <= 3) {
      return amountStr;
    }

    const lastThree = amountStr.slice(-3);
    const remaining = amountStr.slice(0, -3);
    
    // Add commas every 2 digits in remaining part
    const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    
    return formatted;
  }
}
