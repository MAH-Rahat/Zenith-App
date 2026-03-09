import { config } from '../../config';
import { CacheService } from '../cacheService';

/**
 * ARCHITECT Agent - Career Intelligence
 * 
 * Persona: Senior Staff Engineer, unfiltered mentor
 * 
 * Responsibilities:
 * - Analyze weekly work log from completed quests
 * - Compare completed skills against Full-Stack AI Engineer job requirements
 * - Calculate career_alignment_score (0-100) based on skill coverage
 * - Generate weekly_critical_path with exactly 3 highest-leverage tasks
 * - Identify top 5 missing skills with highest market demand
 * - Evaluate portfolio projects for job-readiness
 * - Calculate portfolio_health score (0-100)
 * - Calculate graduation_readiness_score
 * - MANDATORY: Always include hard_truth field with unfiltered feedback
 * - Surface Bangla/Bengali NLP as competitive differentiator for Bangladesh market
 * 
 * Requirements: 49.1-49.8, 50.1-50.5, 51.1-51.5, 52.1-52.5, 82.1-82.4, 89.1-89.5
 */

// ===== Input/Output Interfaces =====

export interface Quest {
  id: string;
  description: string;
  expValue: number;
  isComplete: boolean;
  type: 'main' | 'side';
  completedAt: string | null;
}

export interface SkillNode {
  id: string;
  name: string;
  phase: number;
  isComplete: boolean;
  proofOfWork: string | null;
  completedAt: string | null;
}

export interface Project {
  name: string;
  liveDemo: string | null;
  readme: boolean;
  caseStudy: boolean;
}

export interface ArchitectInput {
  userId: string;
  userInput: string;
  completedQuests: Quest[];
  completedSkills: SkillNode[];
  portfolioProjects: Project[];
  jobPostingKeywords: string[];
}

export interface SkillGap {
  skill: string;
  marketDemand: number;
  impact: number;
  learningResources: string[];
}

export interface ArchitectOutput {
  career_alignment_score: number;
  weekly_critical_path: string[];
  skill_gap_analysis: SkillGap[];
  portfolio_health: number;
  graduation_readiness_score: number;
  hard_truth: string;
}

export interface WeeklyReflectionInput {
  accomplishments: string;
  avoided_tasks: string;
  learning: string;
  challenges: string;
  next_week_priorities: string;
  exp_delta: number;
}

export interface WeeklyGrowthReport {
  what_shipped: string;
  what_avoided: string;
  exp_delta: number;
  hard_truth: string;
}

// ===== Full-Stack AI Engineer Job Requirements =====

const FULL_STACK_AI_ENGINEER_REQUIREMENTS = [
  'react',
  'node',
  'express',
  'mongodb',
  'next.js',
  'typescript',
  'docker',
  'git',
  'ci/cd',
  'aws',
  'python',
  'tensorflow',
  'keras',
  'scikit-learn',
  'pandas',
  'numpy',
  'jwt',
  'bcrypt',
  'owasp',
  'linux',
  'bash',
];

// ===== ARCHITECT Agent Class =====

export class ArchitectAgent {
  /**
   * Process ARCHITECT agent request
   * 
   * Requirements: 49.1, 49.2, 49.3, 49.4, 49.5, 49.6, 49.7, 49.8
   */
  static async process(input: ArchitectInput): Promise<ArchitectOutput> {
    console.log('🏗️ ARCHITECT processing career intelligence...');

    // Calculate career alignment score (Requirements 49.3, 49.4)
    const careerAlignmentScore = this.calculateCareerAlignmentScore(
      input.completedSkills,
      FULL_STACK_AI_ENGINEER_REQUIREMENTS
    );

    // Analyze skill gaps (Requirements 50.1, 50.2, 50.3, 50.4, 50.5)
    const skillGapAnalysis = await this.analyzeSkillGaps(
      input.completedSkills,
      input.jobPostingKeywords
    );

    // Calculate portfolio health (Requirements 51.1, 51.2, 51.3)
    const portfolioHealth = this.calculatePortfolioHealth(input.portfolioProjects);

    // Calculate graduation readiness score
    const graduationReadinessScore = this.calculateGraduationReadinessScore(
      careerAlignmentScore,
      portfolioHealth,
      input.completedSkills.length
    );

    // Generate weekly critical path (Requirements 49.5, 89.1, 89.2, 89.3, 89.4, 89.5)
    const weeklyCriticalPath = await this.generateWeeklyCriticalPath(
      input.userInput,
      skillGapAnalysis,
      portfolioHealth,
      careerAlignmentScore,
      input.portfolioProjects
    );

    // Generate mandatory hard truth (Requirements 49.6, 49.7, 52.1, 52.2, 52.3, 52.4, 52.5, 82.1, 82.2, 82.3, 82.4)
    const hardTruth = await this.generateHardTruth(
      careerAlignmentScore,
      portfolioHealth,
      skillGapAnalysis,
      input.completedQuests
    );

    // Construct output (Requirement 49.6)
    const output: ArchitectOutput = {
      career_alignment_score: careerAlignmentScore,
      weekly_critical_path: weeklyCriticalPath,
      skill_gap_analysis: skillGapAnalysis,
      portfolio_health: portfolioHealth,
      graduation_readiness_score: graduationReadinessScore,
      hard_truth: hardTruth,
    };

    console.log('✅ ARCHITECT processing complete');
    return output;
  }

  /**
   * Generate Weekly Growth Report from reflection
   * 
   * Requirements: 39.5, 39.6, 39.7
   * 
   * Analyzes weekly reflection responses and generates report including:
   * - What shipped
   * - What avoided
   * - EXP delta from previous week
   * - One hard truth
   */
  static async generateWeeklyGrowthReport(
    input: WeeklyReflectionInput
  ): Promise<WeeklyGrowthReport> {
    console.log('🏗️ ARCHITECT generating Weekly Growth Report...');

    try {
      // Check cache first (1 hour TTL)
      const cacheKey = `architect:weekly_report:${input.exp_delta}:${input.accomplishments.substring(0, 50)}`;
      const cached = await CacheService.getCachedGeminiResponse<WeeklyGrowthReport>(cacheKey);

      if (cached) {
        console.log('✅ Weekly Growth Report served from cache');
        return cached;
      }

      // Call Gemini API to generate report
      const report = await this.callGeminiForWeeklyReport(input);

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, report);

      console.log('✅ Weekly Growth Report generated');
      return report;
    } catch (error) {
      console.error('Failed to generate Weekly Growth Report:', error);

      // Return default report if Gemini fails
      return this.getDefaultWeeklyReport(input);
    }
  }

  /**
   * Calculate career alignment score
   * 
   * Requirements: 49.3, 49.4
   * 
   * Compares completed skills against Full-Stack AI Engineer job requirements
   * Returns score 0-100 based on skill coverage
   */
  private static calculateCareerAlignmentScore(
    completedSkills: SkillNode[],
    jobRequirements: string[]
  ): number {
    if (jobRequirements.length === 0) {
      return 0;
    }

    const completedSkillNames = completedSkills
      .filter(skill => skill.isComplete)
      .map(skill => skill.name.toLowerCase());

    // Count how many job requirements are covered by completed skills
    const matchedRequirements = jobRequirements.filter(requirement =>
      completedSkillNames.some(skillName =>
        skillName.includes(requirement.toLowerCase()) ||
        requirement.toLowerCase().includes(skillName)
      )
    );

    const alignmentPercent = (matchedRequirements.length / jobRequirements.length) * 100;

    return Math.round(alignmentPercent);
  }

  /**
   * Analyze skill gaps
   * 
   * Requirements: 50.1, 50.2, 50.3, 50.4, 50.5
   * 
   * Identifies top 5 missing skills with highest market demand
   * Ranks skill gaps by impact on career_alignment_score
   * Suggests specific learning resources for each gap
   * Surfaces Bangla/Bengali NLP as competitive differentiator for Bangladesh market
   */
  private static async analyzeSkillGaps(
    completedSkills: SkillNode[],
    jobPostingKeywords: string[]
  ): Promise<SkillGap[]> {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = `architect:skill_gaps:${completedSkills.length}:${jobPostingKeywords.join(',')}`;
      const cached = await CacheService.getCachedGeminiResponse<SkillGap[]>(cacheKey);

      if (cached) {
        console.log('✅ Skill gap analysis served from cache');
        return cached;
      }

      // Identify missing skills
      const completedSkillNames = completedSkills
        .filter(skill => skill.isComplete)
        .map(skill => skill.name.toLowerCase());

      const allRequiredSkills = [
        ...FULL_STACK_AI_ENGINEER_REQUIREMENTS,
        ...jobPostingKeywords.map(k => k.toLowerCase()),
      ];

      const uniqueRequiredSkills = Array.from(new Set(allRequiredSkills));

      const missingSkills = uniqueRequiredSkills.filter(
        requirement =>
          !completedSkillNames.some(
            skillName =>
              skillName.includes(requirement) || requirement.includes(skillName)
          )
      );

      // Call Gemini API to analyze and rank skill gaps
      const skillGaps = await this.callGeminiForSkillGaps(
        missingSkills,
        completedSkillNames
      );

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, skillGaps);

      return skillGaps;
    } catch (error) {
      console.error('Failed to analyze skill gaps:', error);

      // Return default skill gaps if Gemini fails
      return this.getDefaultSkillGaps(completedSkills);
    }
  }

  /**
   * Calculate portfolio health score
   * 
   * Requirements: 51.1, 51.2, 51.3
   * 
   * Evaluates portfolio projects for: live demo, comprehensive README, case study documentation
   * Returns score 0-100
   */
  private static calculatePortfolioHealth(projects: Project[]): number {
    if (projects.length === 0) {
      return 0;
    }

    let score = 0;
    const maxScore = projects.length * 3; // 3 points per project (demo, readme, case study)

    projects.forEach(project => {
      if (project.liveDemo) score += 1;
      if (project.readme) score += 1;
      if (project.caseStudy) score += 1;
    });

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Calculate graduation readiness score
   * 
   * Combines career alignment, portfolio health, and skill completion
   */
  private static calculateGraduationReadinessScore(
    careerAlignmentScore: number,
    portfolioHealth: number,
    completedSkillsCount: number
  ): number {
    // Weights for each component
    const weights = {
      careerAlignment: 0.4,
      portfolioHealth: 0.35,
      skillCompletion: 0.25,
    };

    // Normalize skill completion (assume 25 total skills across all phases)
    const skillCompletionScore = Math.min((completedSkillsCount / 25) * 100, 100);

    const readinessScore =
      careerAlignmentScore * weights.careerAlignment +
      portfolioHealth * weights.portfolioHealth +
      skillCompletionScore * weights.skillCompletion;

    return Math.round(readinessScore);
  }

  /**
   * Generate weekly critical path
   * 
   * Requirements: 49.5, 89.1, 89.2, 89.3, 89.4, 89.5
   * 
   * Generates exactly 3 highest-leverage tasks for the week
   * Ranks tasks by impact on career_alignment_score
   * Updates every Sunday
   */
  private static async generateWeeklyCriticalPath(
    userInput: string,
    skillGaps: SkillGap[],
    portfolioHealth: number,
    careerAlignmentScore: number,
    portfolioProjects: Project[]
  ): Promise<string[]> {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = `architect:critical_path:${careerAlignmentScore}:${portfolioHealth}`;
      const cached = await CacheService.getCachedGeminiResponse<string[]>(cacheKey);

      if (cached) {
        console.log('✅ Weekly critical path served from cache');
        return cached;
      }

      // Call Gemini API to generate critical path
      const criticalPath = await this.callGeminiForCriticalPath(
        userInput,
        skillGaps,
        portfolioHealth,
        careerAlignmentScore,
        portfolioProjects
      );

      // Ensure exactly 3 tasks (Requirement 89.2)
      const tasks = criticalPath.slice(0, 3);

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, tasks);

      return tasks;
    } catch (error) {
      console.error('Failed to generate weekly critical path:', error);

      // Return default critical path if Gemini fails
      return this.getDefaultCriticalPath(skillGaps, portfolioHealth);
    }
  }

  /**
   * Generate mandatory hard truth
   * 
   * Requirements: 49.6, 49.7, 52.1, 52.2, 52.3, 52.4, 52.5, 82.1, 82.2, 82.3, 82.4
   * 
   * MANDATORY: Always includes hard_truth field with unfiltered feedback
   * Makes hard_truth specific and actionable
   * Limits hard_truth to maximum 2 sentences
   * Never omits hard_truth field
   */
  private static async generateHardTruth(
    careerAlignmentScore: number,
    portfolioHealth: number,
    skillGaps: SkillGap[],
    completedQuests: Quest[]
  ): Promise<string> {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = `architect:hard_truth:${careerAlignmentScore}:${portfolioHealth}`;
      const cached = await CacheService.getCachedGeminiResponse<string>(cacheKey);

      if (cached) {
        console.log('✅ Hard truth served from cache');
        return cached;
      }

      // Call Gemini API to generate hard truth
      const hardTruth = await this.callGeminiForHardTruth(
        careerAlignmentScore,
        portfolioHealth,
        skillGaps,
        completedQuests
      );

      // Ensure maximum 2 sentences (Requirement 52.4)
      const sentences = hardTruth.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const limitedHardTruth = sentences.slice(0, 2).join('. ') + '.';

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, limitedHardTruth);

      return limitedHardTruth;
    } catch (error) {
      console.error('Failed to generate hard truth:', error);

      // Return default hard truth if Gemini fails (Requirement 52.5 - never omit)
      return this.getDefaultHardTruth(careerAlignmentScore, portfolioHealth);
    }
  }

  /**
   * Call Gemini API to analyze skill gaps
   * 
   * Requirements: 50.1, 50.2, 50.3, 50.4, 50.5
   */
  private static async callGeminiForSkillGaps(
    missingSkills: string[],
    completedSkillNames: string[]
  ): Promise<SkillGap[]> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt with Senior Staff Engineer persona (Requirement 49.1)
    const prompt = this.buildSkillGapsPrompt(missingSkills, completedSkillNames);

    // Call Gemini API with exponential backoff
    const response = await this.callGeminiWithRetry(apiKey, prompt);

    // Parse response
    return this.parseSkillGapsResponse(response);
  }

  /**
   * Build prompt for skill gaps analysis
   * 
   * Requirements: 49.1, 50.1, 50.2, 50.3, 50.4, 50.5
   */
  private static buildSkillGapsPrompt(
    missingSkills: string[],
    completedSkillNames: string[]
  ): string {
    return `You are ARCHITECT, a Senior Staff Engineer and unfiltered mentor. Your job is to analyze skill gaps and provide data-driven career guidance.

Completed Skills: ${completedSkillNames.join(', ')}

Missing Skills: ${missingSkills.join(', ')}

REQUIREMENTS (Requirements 50.1, 50.2, 50.3, 50.4, 50.5):
- Identify top 5 missing skills with highest market demand
- Rank skill gaps by impact on career_alignment_score
- Suggest specific learning resources for each gap
- Surface Bangla/Bengali NLP as competitive differentiator for Bangladesh market
- Use unfiltered, direct tone

For each skill gap, provide:
- skill: The skill name
- marketDemand: Score 0-100 based on job market demand
- impact: Score 0-100 based on impact on career alignment
- learningResources: Array of 2-3 specific learning resources (courses, docs, tutorials)

Format:
{
  "skill_gaps": [
    {
      "skill": "Skill name",
      "marketDemand": 85,
      "impact": 90,
      "learningResources": ["Resource 1", "Resource 2", "Resource 3"]
    }
  ]
}`;
  }

  /**
   * Call Gemini API to generate weekly critical path
   * 
   * Requirements: 49.5, 89.1, 89.2, 89.3, 89.4, 89.5
   */
  private static async callGeminiForCriticalPath(
    userInput: string,
    skillGaps: SkillGap[],
    portfolioHealth: number,
    careerAlignmentScore: number,
    portfolioProjects: Project[]
  ): Promise<string[]> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt with Senior Staff Engineer persona (Requirement 49.1)
    const prompt = this.buildCriticalPathPrompt(
      userInput,
      skillGaps,
      portfolioHealth,
      careerAlignmentScore,
      portfolioProjects
    );

    // Call Gemini API with exponential backoff
    const response = await this.callGeminiWithRetry(apiKey, prompt);

    // Parse response
    return this.parseCriticalPathResponse(response);
  }

  /**
   * Build prompt for weekly critical path generation
   * 
   * Requirements: 49.1, 49.5, 89.1, 89.2, 89.3, 89.4, 89.5
   */
  private static buildCriticalPathPrompt(
    userInput: string,
    skillGaps: SkillGap[],
    portfolioHealth: number,
    careerAlignmentScore: number,
    portfolioProjects: Project[]
  ): string {
    return `You are ARCHITECT, a Senior Staff Engineer providing unfiltered career guidance.

User Input: "${userInput}"

Career Alignment Score: ${careerAlignmentScore}/100
Portfolio Health: ${portfolioHealth}/100

Top Skill Gaps:
${skillGaps.map(g => `- ${g.skill} (Market Demand: ${g.marketDemand}, Impact: ${g.impact})`).join('\n')}

Portfolio Projects:
${portfolioProjects.map(p => `- ${p.name} (Live Demo: ${p.liveDemo ? 'Yes' : 'No'}, README: ${p.readme ? 'Yes' : 'No'}, Case Study: ${p.caseStudy ? 'Yes' : 'No'})`).join('\n')}

REQUIREMENTS (Requirements 49.5, 89.1, 89.2, 89.3, 89.4, 89.5):
- Generate exactly 3 highest-leverage tasks for this week
- Rank tasks by impact on career_alignment_score
- Consider skill gaps with highest market demand
- Consider portfolio improvements needed
- Consider competitive differentiators (e.g., Bangla/Bengali NLP for Bangladesh market)
- Leverage user's 5 years graphic design experience in recommendations
- Be specific and actionable

Format:
{
  "weekly_critical_path": [
    "Task 1 - specific and actionable",
    "Task 2 - specific and actionable",
    "Task 3 - specific and actionable"
  ]
}`;
  }

  /**
   * Call Gemini API to generate hard truth
   * 
   * Requirements: 49.6, 49.7, 52.1, 52.2, 52.3, 52.4, 82.1, 82.2, 82.3, 82.4
   */
  private static async callGeminiForHardTruth(
    careerAlignmentScore: number,
    portfolioHealth: number,
    skillGaps: SkillGap[],
    completedQuests: Quest[]
  ): Promise<string> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt with Senior Staff Engineer persona (Requirement 49.1)
    const prompt = this.buildHardTruthPrompt(
      careerAlignmentScore,
      portfolioHealth,
      skillGaps,
      completedQuests
    );

    // Call Gemini API with exponential backoff
    const response = await this.callGeminiWithRetry(apiKey, prompt);

    // Parse response
    return this.parseHardTruthResponse(response);
  }

  /**
   * Build prompt for hard truth generation
   * 
   * Requirements: 49.1, 49.6, 49.7, 52.1, 52.2, 52.3, 52.4, 82.1, 82.2, 82.3, 82.4
   */
  private static buildHardTruthPrompt(
    careerAlignmentScore: number,
    portfolioHealth: number,
    skillGaps: SkillGap[],
    completedQuests: Quest[]
  ): string {
    // Get recent quest activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentQuests = completedQuests.filter(quest => {
      if (!quest.completedAt) return false;
      const completedDate = new Date(quest.completedAt);
      return completedDate >= sevenDaysAgo;
    });

    return `You are ARCHITECT, a Senior Staff Engineer providing brutally honest, unfiltered feedback.

Career Alignment Score: ${careerAlignmentScore}/100
Portfolio Health: ${portfolioHealth}/100
Quests Completed This Week: ${recentQuests.length}

Top Skill Gaps:
${skillGaps.slice(0, 3).map(g => `- ${g.skill}`).join('\n')}

REQUIREMENTS (Requirements 52.1, 52.2, 52.3, 52.4, 82.1, 82.2, 82.3, 82.4):
- Provide unfiltered, direct feedback on current performance
- Reference specific gaps or weaknesses
- Be brutally honest - no sugar coating
- Make feedback specific and actionable
- Maximum 2 sentences
- This is MANDATORY - never omit hard truth

Format:
{
  "hard_truth": "Your unfiltered feedback here. Maximum 2 sentences."
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
                temperature: 0.7, // Moderate temperature for balanced creativity
                maxOutputTokens: 1000,
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
   * Parse Gemini API response for skill gaps
   */
  private static parseSkillGapsResponse(responseText: string): SkillGap[] {
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

      if (!parsed.skill_gaps || !Array.isArray(parsed.skill_gaps)) {
        throw new Error('Invalid response format');
      }

      // Return top 5 skill gaps (Requirement 50.2)
      return parsed.skill_gaps.slice(0, 5);
    } catch (error) {
      console.error('Failed to parse skill gaps response:', error);
      console.error('Response text:', responseText);

      // Return empty array if parsing fails
      return [];
    }
  }

  /**
   * Parse Gemini API response for weekly critical path
   */
  private static parseCriticalPathResponse(responseText: string): string[] {
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

      if (!parsed.weekly_critical_path || !Array.isArray(parsed.weekly_critical_path)) {
        throw new Error('Invalid response format');
      }

      // Return exactly 3 tasks (Requirement 89.2)
      return parsed.weekly_critical_path.slice(0, 3);
    } catch (error) {
      console.error('Failed to parse critical path response:', error);
      console.error('Response text:', responseText);

      // Return empty array if parsing fails
      return [];
    }
  }

  /**
   * Parse Gemini API response for hard truth
   */
  private static parseHardTruthResponse(responseText: string): string {
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

      if (!parsed.hard_truth || typeof parsed.hard_truth !== 'string') {
        throw new Error('Invalid response format');
      }

      return parsed.hard_truth;
    } catch (error) {
      console.error('Failed to parse hard truth response:', error);
      console.error('Response text:', responseText);

      // Return default hard truth if parsing fails (Requirement 52.5 - never omit)
      return 'Your career alignment is below target. Focus on closing skill gaps immediately.';
    }
  }

  /**
   * Get default skill gaps when Gemini fails
   */
  private static getDefaultSkillGaps(completedSkills: SkillNode[]): SkillGap[] {
    const completedSkillNames = completedSkills
      .filter(skill => skill.isComplete)
      .map(skill => skill.name.toLowerCase());

    const defaultGaps: SkillGap[] = [];

    // Check for common missing skills
    if (!completedSkillNames.some(name => name.includes('docker'))) {
      defaultGaps.push({
        skill: 'Docker',
        marketDemand: 90,
        impact: 85,
        learningResources: [
          'Docker Official Documentation',
          'Docker Mastery Course (Udemy)',
          'Play with Docker (hands-on)',
        ],
      });
    }

    if (!completedSkillNames.some(name => name.includes('python'))) {
      defaultGaps.push({
        skill: 'Python',
        marketDemand: 95,
        impact: 90,
        learningResources: [
          'Python Official Tutorial',
          'Automate the Boring Stuff with Python',
          'Real Python Tutorials',
        ],
      });
    }

    if (!completedSkillNames.some(name => name.includes('tensorflow') && name.includes('keras'))) {
      defaultGaps.push({
        skill: 'TensorFlow/Keras',
        marketDemand: 85,
        impact: 88,
        learningResources: [
          'TensorFlow Official Tutorials',
          'Deep Learning Specialization (Coursera)',
          'Keras Documentation',
        ],
      });
    }

    // Add Bangla/Bengali NLP as competitive differentiator (Requirement 50.5)
    defaultGaps.push({
      skill: 'Bangla/Bengali NLP',
      marketDemand: 75,
      impact: 95,
      learningResources: [
        'IndicNLP Library Documentation',
        'Bengali NLP Research Papers',
        'Hugging Face Bengali Models',
      ],
    });

    if (!completedSkillNames.some(name => name.includes('ci/cd') || name.includes('cicd'))) {
      defaultGaps.push({
        skill: 'CI/CD',
        marketDemand: 88,
        impact: 82,
        learningResources: [
          'GitHub Actions Documentation',
          'GitLab CI/CD Tutorial',
          'Jenkins Official Guide',
        ],
      });
    }

    return defaultGaps.slice(0, 5);
  }

  /**
   * Get default weekly critical path when Gemini fails
   */
  private static getDefaultCriticalPath(
    skillGaps: SkillGap[],
    portfolioHealth: number
  ): string[] {
    const tasks: string[] = [];

    // Task 1: Address highest impact skill gap
    if (skillGaps.length > 0) {
      const topGap = skillGaps[0];
      tasks.push(
        `Complete ${topGap.skill} tutorial and build proof-of-work project (Impact: ${topGap.impact}/100)`
      );
    } else {
      tasks.push('Complete next phase skill node with proof-of-work submission');
    }

    // Task 2: Portfolio improvement
    if (portfolioHealth < 70) {
      tasks.push(
        'Add comprehensive README and case study to existing portfolio project'
      );
    } else {
      tasks.push('Start new portfolio project showcasing latest skills');
    }

    // Task 3: Competitive differentiator
    tasks.push(
      'Research Bangla/Bengali NLP opportunities in Bangladesh tech market'
    );

    return tasks.slice(0, 3);
  }

  /**
   * Get default hard truth when Gemini fails
   * 
   * Requirement: 52.5 - Never omit hard_truth field
   */
  private static getDefaultHardTruth(
    careerAlignmentScore: number,
    portfolioHealth: number
  ): string {
    if (careerAlignmentScore < 50 && portfolioHealth < 50) {
      return 'Your career alignment and portfolio are both below 50%. You are not job-ready and need immediate action on both fronts.';
    } else if (careerAlignmentScore < 50) {
      return `Career alignment at ${careerAlignmentScore}% is critically low. Close skill gaps or you will not be competitive for Full-Stack AI Engineer roles.`;
    } else if (portfolioHealth < 50) {
      return `Portfolio health at ${portfolioHealth}% is unacceptable. Add live demos, READMEs, and case studies to all projects immediately.`;
    } else if (careerAlignmentScore < 70) {
      return `Career alignment at ${careerAlignmentScore}% is mediocre. You are behind peers who are shipping more and learning faster.`;
    } else if (portfolioHealth < 70) {
      return `Portfolio health at ${portfolioHealth}% needs improvement. Your projects lack the polish expected for senior roles.`;
    } else {
      return `You are on track but not exceptional. Leverage your 5 years of design experience to create visually stunning projects that stand out.`;
    }
  }

  /**
   * Call Gemini API to generate Weekly Growth Report
   * 
   * Requirements: 39.5, 39.6
   */
  private static async callGeminiForWeeklyReport(
    input: WeeklyReflectionInput
  ): Promise<WeeklyGrowthReport> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt with Senior Staff Engineer persona
    const prompt = this.buildWeeklyReportPrompt(input);

    // Call Gemini API with exponential backoff
    const response = await this.callGeminiWithRetry(apiKey, prompt);

    // Parse response
    return this.parseWeeklyReportResponse(response, input.exp_delta);
  }

  /**
   * Build prompt for Weekly Growth Report generation
   * 
   * Requirements: 39.5, 39.6
   */
  private static buildWeeklyReportPrompt(input: WeeklyReflectionInput): string {
    return `You are ARCHITECT, a Senior Staff Engineer providing unfiltered weekly growth analysis.

WEEKLY REFLECTION RESPONSES:

Accomplishments: ${input.accomplishments}

Avoided Tasks: ${input.avoided_tasks}

Learning: ${input.learning}

Challenges: ${input.challenges}

Next Week Priorities: ${input.next_week_priorities}

EXP Delta from Previous Week: ${input.exp_delta > 0 ? '+' : ''}${input.exp_delta}

REQUIREMENTS (Requirements 39.5, 39.6):
- Analyze what shipped this week (be specific, reference actual accomplishments)
- Analyze what was avoided (be direct about procrastination patterns)
- Include the EXP delta value
- Provide one hard truth (maximum 2 sentences, brutally honest, actionable)
- Use unfiltered, direct tone
- Reference specific items from the reflection

Format:
{
  "what_shipped": "Specific analysis of accomplishments",
  "what_avoided": "Direct analysis of avoided tasks and patterns",
  "hard_truth": "Your unfiltered feedback. Maximum 2 sentences."
}`;
  }

  /**
   * Parse Gemini API response for Weekly Growth Report
   */
  private static parseWeeklyReportResponse(
    responseText: string,
    expDelta: number
  ): WeeklyGrowthReport {
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

      if (!parsed.what_shipped || !parsed.what_avoided || !parsed.hard_truth) {
        throw new Error('Invalid response format');
      }

      return {
        what_shipped: parsed.what_shipped,
        what_avoided: parsed.what_avoided,
        exp_delta: expDelta,
        hard_truth: parsed.hard_truth,
      };
    } catch (error) {
      console.error('Failed to parse Weekly Growth Report response:', error);
      console.error('Response text:', responseText);

      // Return default report if parsing fails
      return {
        what_shipped: 'Unable to analyze accomplishments.',
        what_avoided: 'Unable to analyze avoided tasks.',
        exp_delta: expDelta,
        hard_truth: 'Reflection analysis failed. Try again.',
      };
    }
  }

  /**
   * Get default Weekly Growth Report when Gemini fails
   */
  private static getDefaultWeeklyReport(input: WeeklyReflectionInput): WeeklyGrowthReport {
    const expTrend = input.exp_delta > 0 ? 'up' : input.exp_delta < 0 ? 'down' : 'flat';
    
    return {
      what_shipped: input.accomplishments.length > 0 
        ? `You reported accomplishments this week. EXP is ${expTrend}.`
        : 'No significant accomplishments reported.',
      what_avoided: input.avoided_tasks.length > 0
        ? 'You acknowledged tasks you avoided. Address these next week.'
        : 'No avoided tasks reported.',
      exp_delta: input.exp_delta,
      hard_truth: input.exp_delta < 0
        ? `EXP dropped by ${Math.abs(input.exp_delta)} this week. You are regressing, not progressing.`
        : input.exp_delta === 0
        ? 'Zero EXP growth this week. Stagnation is the enemy of graduation readiness.'
        : `EXP up ${input.exp_delta} this week. Maintain this velocity or you will fall behind.`,
    };
  }
}
