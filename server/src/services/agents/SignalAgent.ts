import { config } from '../../config';
import { CacheService } from '../cacheService';
import { Notification } from '../../models/Notification';
import mongoose from 'mongoose';

/**
 * SIGNAL Agent - Market Intelligence
 * 
 * Persona: Industry analyst, data-first, opportunity-obsessed
 * 
 * Responsibilities:
 * - ONLY agent with internet access via Gemini API web search grounding
 * - Scan AI/ML and Full-Stack job postings
 * - Extract top 10 demanded skills from job postings
 * - Identify trending technologies week-over-week
 * - Scan for hackathons, open source bounties, freelance gigs, Bangladesh tech events
 * - Filter opportunities by relevance to Full-Stack AI Engineer skills
 * - Track Bangladesh tech job market data
 * - Identify top hiring companies in Bangladesh
 * - Track salary ranges for Full-Stack and AI/ML roles in BDT
 * - Identify remote work opportunities from Bangladesh
 * - Track skill demand trends week-over-week
 * - Trigger alerts when skill shows >20% increase in job posting mentions
 * 
 * Requirements: 56.1-56.7, 57.1-57.5, 58.1-58.5, 59.1-59.5, 64.2, 64.4
 */

// ===== Input/Output Interfaces =====

export interface SignalInput {
  userId: string;
  userInput: string;
  previousSkillDemands?: SkillDemand[];
}

export interface SkillDemand {
  skill: string;
  mentions: number;
  week: string;
}

export interface Opportunity {
  title: string;
  type: 'hackathon' | 'bounty' | 'freelance' | 'event';
  deadline: string | null;
  link: string;
  relevance_score: number;
  description: string;
}

export interface BangladeshMarketInsight {
  top_hiring_companies: string[];
  salary_ranges: {
    full_stack_min_bdt: number;
    full_stack_max_bdt: number;
    ai_ml_min_bdt: number;
    ai_ml_max_bdt: number;
  };
  remote_opportunities: string[];
  market_summary: string;
}

export interface TrendingSkill {
  skill: string;
  current_mentions: number;
  previous_mentions: number;
  increase_percentage: number;
}

export interface DemandSpikeAlert {
  skill: string;
  increase_percentage: number;
  recommended_resources: string[];
}

export interface SignalOutput {
  top_demanded_skills: string[];
  opportunities: Opportunity[];
  bangladesh_market_insights: BangladeshMarketInsight;
  trending_this_week: TrendingSkill[];
  alert: DemandSpikeAlert | null;
}

// ===== SIGNAL Agent Class =====

export class SignalAgent {
  /**
   * Process SIGNAL agent request
   * 
   * Requirements: 56.1, 56.2, 56.3, 56.4, 56.5, 56.6
   */
  static async process(input: SignalInput): Promise<SignalOutput> {
    console.log('📡 SIGNAL processing market intelligence request...');

    // Scan job market with web search (Requirements 56.2, 56.3, 56.4, 56.5)
    const marketData = await this.scanJobMarket(input.userInput);
    const topDemandedSkills = marketData.top_demanded_skills.slice(0, 10);

    // Scan for opportunities (Requirements 57.1, 57.2, 57.3)
    const opportunities = await this.scanOpportunities();

    // Get Bangladesh market insights (Requirements 58.1, 58.2, 58.3, 58.4)
    const bangladeshMarketInsights = await this.getBangladeshMarketInsights();

    // Calculate trending skills (Requirement 59.1)
    const trendingThisWeek = this.calculateTrendingSkills(
      marketData.skill_demands,
      input.previousSkillDemands || []
    );

    // Check for demand spike alerts (Requirements 59.2, 59.3)
    const alert = this.checkDemandSpikeAlert(trendingThisWeek);

    // Construct output (Requirement 56.6)
    const output: SignalOutput = {
      top_demanded_skills: topDemandedSkills,
      opportunities,
      bangladesh_market_insights: bangladeshMarketInsights,
      trending_this_week: trendingThisWeek,
      alert,
    };

    // Send notifications (Requirements 57.4, 57.5, 59.4)
    await this.notifyHighValueOpportunities(input.userId, opportunities);
    await this.persistOpportunities(input.userId, opportunities);

    if (alert) {
      await this.sendDemandSpikeAlert(input.userId, alert);
    }

    console.log('✅ SIGNAL processing complete');
    return output;
  }

  /**
   * Scan job market for AI/ML and Full-Stack roles
   * 
   * Requirements: 56.2, 56.3, 56.4, 56.5
   */
  private static async scanJobMarket(userInput: string): Promise<{
    top_demanded_skills: string[];
    skill_demands: SkillDemand[];
  }> {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = `signal:job_market:${userInput}`;
      const cached = await CacheService.getCachedGeminiResponse<{
        top_demanded_skills: string[];
        skill_demands: SkillDemand[];
      }>(cacheKey);

      if (cached) {
        console.log('✅ Job market data served from cache');
        return cached;
      }

      // Call Gemini API with web search
      const marketData = await this.callGeminiWithWebSearch(userInput);

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, marketData);

      return marketData;
    } catch (error) {
      console.error('Failed to scan job market:', error);
      return this.getMockJobMarketData();
    }
  }

  /**
   * Call Gemini API with web search grounding
   * 
   * Requirement: 56.2, 56.7
   */
  private static async callGeminiWithWebSearch(userInput: string): Promise<{
    top_demanded_skills: string[];
    skill_demands: SkillDemand[];
  }> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt with industry analyst persona (Requirement 56.1)
    const prompt = this.buildJobMarketPrompt(userInput);

    // Call Gemini API with web search grounding (Requirement 56.7)
    const response = await this.callGeminiWithRetry(apiKey, prompt, true);

    // Parse response
    return this.parseJobMarketResponse(response);
  }

  /**
   * Build prompt for job market scanning
   * 
   * Requirements: 56.1, 56.3, 56.4, 56.5
   */
  private static buildJobMarketPrompt(userInput: string): string {
    const currentWeek = this.getCurrentWeek();

    return `You are SIGNAL, an industry analyst who is data-first and opportunity-obsessed. Your job is to scan the current job market for AI/ML and Full-Stack engineering roles.

User Query: "${userInput}"

TASK:
1. Search for recent AI/ML and Full-Stack job postings (last 7 days)
2. Extract the top 10 most demanded technical skills from these postings
3. Count how many times each skill is mentioned
4. Focus on: programming languages, frameworks, tools, cloud platforms, AI/ML libraries

REQUIREMENTS:
- Use data-first, analytical tone
- Search actual job postings using web search
- Extract concrete skill names (e.g., "React", "Python", "TensorFlow", "AWS")
- Count skill mentions across multiple job postings
- Current week: ${currentWeek}

Format your response as JSON:
{
  "top_demanded_skills": ["skill1", "skill2", ...],
  "skill_demands": [
    {"skill": "skill1", "mentions": 45, "week": "${currentWeek}"},
    {"skill": "skill2", "mentions": 38, "week": "${currentWeek}"},
    ...
  ]
}`;
  }

  /**
   * Scan for opportunities
   * 
   * Requirements: 57.1, 57.2, 57.3
   */
  private static async scanOpportunities(): Promise<Opportunity[]> {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = 'signal:opportunities';
      const cached = await CacheService.getCachedGeminiResponse<Opportunity[]>(cacheKey);

      if (cached) {
        console.log('✅ Opportunities served from cache');
        return cached;
      }

      // Call Gemini API
      const opportunities = await this.callGeminiForOpportunities();

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, opportunities);

      return opportunities;
    } catch (error) {
      console.error('Failed to scan opportunities:', error);
      return [];
    }
  }

  /**
   * Call Gemini API for opportunity detection
   * 
   * Requirements: 57.1, 57.2
   */
  private static async callGeminiForOpportunities(): Promise<Opportunity[]> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = this.buildOpportunitiesPrompt();
    const response = await this.callGeminiWithRetry(apiKey, prompt, true);

    return this.parseOpportunitiesResponse(response);
  }

  /**
   * Build prompt for opportunity detection
   * 
   * Requirements: 57.1, 57.2
   */
  private static buildOpportunitiesPrompt(): string {
    return `You are SIGNAL, an opportunity-obsessed industry analyst. Your job is to find current opportunities for Full-Stack AI Engineers.

TASK:
Search for the following types of opportunities:
1. Hackathons (tech/AI focused)
2. Open source bounties (GitHub, Gitcoin, etc.)
3. Freelance gigs (Upwork, Fiverr, etc. for AI/ML or Full-Stack work)
4. Bangladesh tech events (conferences, meetups, workshops)

REQUIREMENTS:
- Only include opportunities that are currently open or upcoming
- Filter by relevance to Full-Stack AI Engineer skills
- Include deadlines if available
- Include direct links
- Rate relevance 0-100 based on skill match

Format your response as JSON:
{
  "opportunities": [
    {
      "title": "Opportunity title",
      "type": "hackathon|bounty|freelance|event",
      "deadline": "2024-12-31" or null,
      "link": "https://...",
      "relevance_score": 85,
      "description": "Brief description"
    },
    ...
  ]
}`;
  }

  /**
   * Get Bangladesh market insights
   * 
   * Requirements: 58.1, 58.2, 58.3, 58.4
   */
  private static async getBangladeshMarketInsights(): Promise<BangladeshMarketInsight> {
    try {
      // Check cache first (1 week TTL for market insights)
      const cacheKey = 'signal:bangladesh_market';
      const cached = await CacheService.getCachedGeminiResponse<BangladeshMarketInsight>(cacheKey);

      if (cached) {
        console.log('✅ Bangladesh market insights served from cache');
        return cached;
      }

      // Call Gemini API
      const insights = await this.callGeminiForBangladeshMarket();

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, insights);

      return insights;
    } catch (error) {
      console.error('Failed to get Bangladesh market insights:', error);
      return this.getMockBangladeshMarketInsights();
    }
  }

  /**
   * Call Gemini API for Bangladesh market data
   * 
   * Requirements: 58.1, 58.2, 58.3, 58.4
   */
  private static async callGeminiForBangladeshMarket(): Promise<BangladeshMarketInsight> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = this.buildBangladeshMarketPrompt();
    const response = await this.callGeminiWithRetry(apiKey, prompt, true);

    return this.parseBangladeshMarketResponse(response);
  }

  /**
   * Build prompt for Bangladesh market insights
   * 
   * Requirements: 58.1, 58.2, 58.3, 58.4
   */
  private static buildBangladeshMarketPrompt(): string {
    return `You are SIGNAL, a data-first industry analyst focused on the Bangladesh tech market.

TASK:
Search for current Bangladesh tech job market data:
1. Top hiring companies in Bangladesh (tech companies, startups, MNCs)
2. Salary ranges for Full-Stack developers in BDT
3. Salary ranges for AI/ML engineers in BDT
4. Remote work opportunities from Bangladesh

REQUIREMENTS:
- Focus specifically on Bangladesh market
- Provide salary ranges in BDT (Bangladeshi Taka)
- Identify companies actively hiring
- Highlight remote work opportunities

Format your response as JSON:
{
  "top_hiring_companies": ["Company1", "Company2", ...],
  "salary_ranges": {
    "full_stack_min_bdt": 50000,
    "full_stack_max_bdt": 150000,
    "ai_ml_min_bdt": 80000,
    "ai_ml_max_bdt": 200000
  },
  "remote_opportunities": ["Remote opportunity 1", "Remote opportunity 2", ...],
  "market_summary": "Brief summary of Bangladesh tech market"
}`;
  }

  /**
   * Calculate trending skills week-over-week
   * 
   * Requirement: 59.1
   */
  private static calculateTrendingSkills(
    currentSkillDemands: SkillDemand[],
    previousSkillDemands: SkillDemand[]
  ): TrendingSkill[] {
    const trending: TrendingSkill[] = [];
    const previousMap = new Map<string, number>();

    // Build map of previous skill mentions
    for (const demand of previousSkillDemands) {
      previousMap.set(demand.skill, demand.mentions);
    }

    // Calculate percentage increase for each skill
    for (const current of currentSkillDemands) {
      const previous = previousMap.get(current.skill) || 0;

      if (previous > 0) {
        const increasePercentage = ((current.mentions - previous) / previous) * 100;

        trending.push({
          skill: current.skill,
          current_mentions: current.mentions,
          previous_mentions: previous,
          increase_percentage: Math.round(increasePercentage * 10) / 10,
        });
      }
    }

    // Sort by increase percentage descending
    trending.sort((a, b) => b.increase_percentage - a.increase_percentage);

    // Return top 5 trending skills
    return trending.slice(0, 5);
  }

  /**
   * Check for demand spike alerts
   * 
   * Requirements: 59.2, 59.3
   */
  private static checkDemandSpikeAlert(trendingSkills: TrendingSkill[]): DemandSpikeAlert | null {
    // Find first skill with >20% increase (Requirement 59.2)
    const spikeSkill = trendingSkills.find(skill => skill.increase_percentage > 20);

    if (!spikeSkill) {
      return null;
    }

    // Generate recommended resources (Requirement 59.3)
    const recommendedResources = this.getRecommendedResources(spikeSkill.skill);

    return {
      skill: spikeSkill.skill,
      increase_percentage: spikeSkill.increase_percentage,
      recommended_resources: recommendedResources,
    };
  }

  /**
   * Get recommended learning resources for a skill
   * 
   * Requirement: 59.3
   */
  private static getRecommendedResources(skill: string): string[] {
    return [
      `${skill} official documentation`,
      `${skill} tutorial on freeCodeCamp`,
      `${skill} course on Udemy/Coursera`,
    ];
  }

  /**
   * Notify user of high-value opportunities
   * 
   * Requirements: 57.4
   */
  private static async notifyHighValueOpportunities(
    userId: string,
    opportunities: Opportunity[]
  ): Promise<void> {
    try {
      // Filter high-value opportunities (relevance >= 80)
      const highValueOpportunities = opportunities.filter(opp => opp.relevance_score >= 80);

      if (highValueOpportunities.length === 0) {
        return;
      }

      // Send notification for each high-value opportunity
      for (const opportunity of highValueOpportunities) {
        await Notification.create({
          userId: new mongoose.Types.ObjectId(userId),
          type: 'signal',
          title: `SIGNAL: High-Value Opportunity - ${opportunity.title}`,
          message: `${opportunity.title} (Relevance: ${opportunity.relevance_score}%)`,
          data: opportunity,
          isRead: false,
          timestamp: new Date(),
        });
      }

      console.log(`✅ Sent ${highValueOpportunities.length} high-value opportunity notifications`);
    } catch (error) {
      console.error('Failed to send opportunity notifications:', error);
      // Don't throw - notification failure shouldn't break the agent
    }
  }

  /**
   * Send demand spike alert notification
   * 
   * Requirement: 59.4
   */
  private static async sendDemandSpikeAlert(
    userId: string,
    alert: DemandSpikeAlert
  ): Promise<void> {
    try {
      await Notification.create({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'signal',
        title: 'SIGNAL: Tech Demand Spike Alert',
        message: `${alert.skill} demand increased by ${alert.increase_percentage}%`,
        data: alert,
        isRead: false,
        timestamp: new Date(),
      });

      console.log('✅ Demand spike alert notification sent');
    } catch (error) {
      console.error('Failed to send demand spike alert:', error);
      // Don't throw - notification failure shouldn't break the agent
    }
  }

  /**
   * Persist opportunities to notifications table
   * 
   * Requirement: 57.5
   */
  private static async persistOpportunities(
    userId: string,
    opportunities: Opportunity[]
  ): Promise<void> {
    try {
      // Filter opportunities with deadlines
      const opportunitiesWithDeadlines = opportunities.filter(opp => opp.deadline);

      if (opportunitiesWithDeadlines.length === 0) {
        return;
      }

      // Create notification with opportunities
      await Notification.create({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'signal',
        title: 'SIGNAL: Opportunities Update',
        message: `Found ${opportunitiesWithDeadlines.length} opportunities with upcoming deadlines`,
        data: { opportunities: opportunitiesWithDeadlines },
        isRead: false,
        timestamp: new Date(),
      });

      console.log(`✅ Persisted ${opportunitiesWithDeadlines.length} opportunities`);
    } catch (error) {
      console.error('Failed to persist opportunities:', error);
      // Don't throw - notification failure shouldn't break the agent
    }
  }

  /**
   * Call Gemini API with exponential backoff retry logic
   * 
   * Requirements: 56.7, 60.7
   */
  private static async callGeminiWithRetry(
    apiKey: string,
    prompt: string,
    useWebSearch: boolean = false,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Build request body
        const requestBody: any = {
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
            temperature: 0.3, // Low temperature for data-first precision
            maxOutputTokens: 1500,
          },
        };

        // Add web search grounding if requested (Requirement 56.7)
        if (useWebSearch) {
          requestBody.tools = [
            {
              googleSearchRetrieval: {
                dynamicRetrievalConfig: {
                  mode: 'MODE_DYNAMIC',
                  dynamicThreshold: 0.7,
                },
              },
            },
          ];
        }

        // Call Gemini API
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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

        // Exponential backoff: wait 2^attempt seconds (Requirement 60.7)
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
   * Parse Gemini API response for job market data
   */
  private static parseJobMarketResponse(responseText: string): {
    top_demanded_skills: string[];
    skill_demands: SkillDemand[];
  } {
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

      if (!parsed.top_demanded_skills || !Array.isArray(parsed.top_demanded_skills)) {
        throw new Error('Invalid response format');
      }

      return {
        top_demanded_skills: parsed.top_demanded_skills,
        skill_demands: parsed.skill_demands || [],
      };
    } catch (error) {
      console.error('Failed to parse job market response:', error);
      console.error('Response text:', responseText);

      // Return mock data if parsing fails
      return this.getMockJobMarketData();
    }
  }

  /**
   * Parse Gemini API response for opportunities
   */
  private static parseOpportunitiesResponse(responseText: string): Opportunity[] {
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

      if (!parsed.opportunities || !Array.isArray(parsed.opportunities)) {
        throw new Error('Invalid response format');
      }

      return parsed.opportunities;
    } catch (error) {
      console.error('Failed to parse opportunities response:', error);
      console.error('Response text:', responseText);

      // Return empty array if parsing fails
      return [];
    }
  }

  /**
   * Parse Gemini API response for Bangladesh market insights
   */
  private static parseBangladeshMarketResponse(responseText: string): BangladeshMarketInsight {
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

      if (!parsed.top_hiring_companies || !parsed.salary_ranges) {
        throw new Error('Invalid response format');
      }

      return parsed as BangladeshMarketInsight;
    } catch (error) {
      console.error('Failed to parse Bangladesh market response:', error);
      console.error('Response text:', responseText);

      // Return mock data if parsing fails
      return this.getMockBangladeshMarketInsights();
    }
  }

  /**
   * Get mock job market data (fallback)
   */
  private static getMockJobMarketData(): {
    top_demanded_skills: string[];
    skill_demands: SkillDemand[];
  } {
    const currentWeek = this.getCurrentWeek();

    return {
      top_demanded_skills: [
        'Python',
        'React',
        'TypeScript',
        'Node.js',
        'AWS',
        'Docker',
        'TensorFlow',
        'PostgreSQL',
        'Kubernetes',
        'Git',
      ],
      skill_demands: [
        { skill: 'Python', mentions: 45, week: currentWeek },
        { skill: 'React', mentions: 38, week: currentWeek },
        { skill: 'TypeScript', mentions: 35, week: currentWeek },
        { skill: 'Node.js', mentions: 32, week: currentWeek },
        { skill: 'AWS', mentions: 28, week: currentWeek },
        { skill: 'Docker', mentions: 25, week: currentWeek },
        { skill: 'TensorFlow', mentions: 22, week: currentWeek },
        { skill: 'PostgreSQL', mentions: 20, week: currentWeek },
        { skill: 'Kubernetes', mentions: 18, week: currentWeek },
        { skill: 'Git', mentions: 15, week: currentWeek },
      ],
    };
  }

  /**
   * Get mock Bangladesh market insights (fallback)
   */
  private static getMockBangladeshMarketInsights(): BangladeshMarketInsight {
    return {
      top_hiring_companies: ['bKash', 'Pathao', 'Chaldal', 'ShopUp', 'Grameenphone'],
      salary_ranges: {
        full_stack_min_bdt: 50000,
        full_stack_max_bdt: 150000,
        ai_ml_min_bdt: 80000,
        ai_ml_max_bdt: 200000,
      },
      remote_opportunities: [
        'Remote Full-Stack positions at international companies',
        'Freelance AI/ML projects on Upwork',
        'Remote contract work for US/EU startups',
      ],
      market_summary:
        'Bangladesh tech market is growing rapidly with increasing demand for Full-Stack and AI/ML engineers.',
    };
  }

  /**
   * Get current week in YYYY-WXX format
   */
  private static getCurrentWeek(): string {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);

    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  }
}
