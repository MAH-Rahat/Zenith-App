import { config } from '../../config';
import { CacheService } from '../cacheService';

/**
 * FORGE Agent - Project Accountability
 * 
 * Persona: Relentless tech lead who despises abandoned repos
 * 
 * Responsibilities:
 * - Track active projects with completion percentage
 * - Enforce project standards: live demo, README, case study
 * - Calculate started vs shipped ratio weekly
 * - Flag repos with >30 days of inactivity as "abandoned"
 * - Calculate design leverage score based on UI/UX quality
 * - Reference user's 5 years graphic design experience
 * - Suggest next project to build based on skill gaps
 * 
 * Requirements: 53.1, 53.2, 53.3, 53.4, 53.5, 53.6, 53.7, 54.1, 54.2, 54.3, 54.4, 55.1, 55.2, 55.3, 55.4
 */

// ===== Input/Output Interfaces =====

export interface GitHubRepo {
  name: string;
  url: string;
  lastCommitDate: string; // ISO 8601 format
  hasLiveDemo: boolean;
  hasReadme: boolean;
  hasCaseStudy: boolean;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
}

export interface ForgeInput {
  userId: string;
  userInput: string;
  githubUsername: string;
  githubRepos: GitHubRepo[];
  userDesignExperience: number; // 5 years
}

export interface ProjectStatus {
  name: string;
  url: string;
  status: 'active' | 'abandoned' | 'shipped';
  completionPercentage: number;
  lastActivity: string;
  daysInactive: number;
  missingStandards: string[];
}

export interface ForgeOutput {
  active_projects: ProjectStatus[];
  suggested_next_build: string;
  shipped_this_month: number;
  started_vs_shipped_ratio: string;
  accountability_message: string;
  design_leverage_score: number;
}

// ===== GitHub REST API v3 Response Types =====

interface GitHubApiRepo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  has_pages: boolean;
  homepage: string | null;
}

interface GitHubApiCommit {
  commit: {
    author: {
      date: string;
    };
  };
}

// ===== FORGE Agent Class =====

export class ForgeAgent {
  /**
   * Process FORGE agent request
   * 
   * Requirements: 53.1, 53.2, 53.3, 53.4, 53.5, 53.6, 53.7
   */
  static async process(input: ForgeInput): Promise<ForgeOutput> {
    console.log('🔨 FORGE processing project accountability...');

    // Fetch GitHub repos if not provided (Requirements 54.1, 54.2, 54.3)
    let repos = input.githubRepos;
    if (!repos || repos.length === 0) {
      repos = await this.fetchGitHubRepos(input.githubUsername);
    }

    // Track active projects with completion percentage (Requirement 53.2)
    const projectStatuses = this.trackProjects(repos);

    // Calculate started vs shipped ratio (Requirement 53.4)
    const startedVsShippedRatio = this.calculateStartedVsShippedRatio(projectStatuses);

    // Count shipped projects this month
    const shippedThisMonth = this.countShippedThisMonth(projectStatuses);

    // Calculate design leverage score (Requirements 55.1, 55.2)
    const designLeverageScore = this.calculateDesignLeverageScore(repos);

    // Generate suggested next build using Gemini API (Requirement 53.7)
    const suggestedNextBuild = await this.generateSuggestedNextBuild(
      input.userInput,
      projectStatuses,
      designLeverageScore,
      repos
    );

    // Generate accountability message using Gemini API (Requirements 53.1, 53.7, 55.3)
    const accountabilityMessage = await this.generateAccountabilityMessage(
      projectStatuses,
      startedVsShippedRatio,
      designLeverageScore,
      input.userDesignExperience
    );

    // Construct output (Requirement 53.6)
    const output: ForgeOutput = {
      active_projects: projectStatuses,
      suggested_next_build: suggestedNextBuild,
      shipped_this_month: shippedThisMonth,
      started_vs_shipped_ratio: startedVsShippedRatio,
      accountability_message: accountabilityMessage,
      design_leverage_score: designLeverageScore,
    };

    console.log('✅ FORGE processing complete');
    return output;
  }

  /**
   * Fetch GitHub repositories using GitHub REST API v3
   * 
   * Requirements: 54.1, 54.2, 54.3
   */
  private static async fetchGitHubRepos(githubUsername: string): Promise<GitHubRepo[]> {
    try {
      // Check cache first (24 hours TTL) - Requirement 54.5
      const cacheKey = `forge:github:${githubUsername}`;
      const cached = await CacheService.getCachedGitHubData<GitHubRepo[]>(cacheKey);

      if (cached) {
        console.log('✅ GitHub repos served from cache');
        return cached;
      }

      // Fetch from GitHub API
      console.log('🔄 Fetching GitHub repos...');
      const repos = await this.callGitHubApi(githubUsername);

      // Cache the result (24 hours TTL)
      await CacheService.cacheGitHubData(cacheKey, repos);

      return repos;
    } catch (error) {
      console.error('Failed to fetch GitHub repos:', error);
      
      // Return empty array if GitHub API fails
      return [];
    }
  }

  /**
   * Call GitHub REST API v3 to fetch user repositories
   * 
   * Requirements: 54.1, 54.2, 54.3
   */
  private static async callGitHubApi(githubUsername: string): Promise<GitHubRepo[]> {
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      console.warn('⚠️ No GitHub token configured, using unauthenticated API (rate limited)');
    }

    try {
      // Fetch user repositories
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Zenith-App',
      };

      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
      }

      const response = await fetch(
        `https://api.github.com/users/${githubUsername}/repos?sort=pushed&per_page=100`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const apiRepos: GitHubApiRepo[] = await response.json() as GitHubApiRepo[];

      // Transform to GitHubRepo format
      const repos: GitHubRepo[] = [];

      for (const apiRepo of apiRepos) {
        // Fetch last commit date (Requirement 54.3)
        const lastCommitDate = await this.fetchLastCommitDate(
          githubUsername,
          apiRepo.name,
          githubToken
        );

        // Check for README
        const hasReadme = await this.checkForReadme(
          githubUsername,
          apiRepo.name,
          githubToken
        );

        repos.push({
          name: apiRepo.name,
          url: apiRepo.html_url,
          lastCommitDate: lastCommitDate || apiRepo.pushed_at,
          hasLiveDemo: !!(apiRepo.has_pages || apiRepo.homepage),
          hasReadme,
          hasCaseStudy: false, // Cannot detect automatically, assume false
          description: apiRepo.description,
          language: apiRepo.language,
          stars: apiRepo.stargazers_count,
          forks: apiRepo.forks_count,
        });
      }

      return repos;
    } catch (error) {
      console.error('GitHub API call failed:', error);
      throw error;
    }
  }

  /**
   * Fetch last commit date for a repository
   * 
   * Requirement: 54.3
   */
  private static async fetchLastCommitDate(
    username: string,
    repoName: string,
    githubToken: string | undefined
  ): Promise<string | null> {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Zenith-App',
      };

      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
      }

      const response = await fetch(
        `https://api.github.com/repos/${username}/${repoName}/commits?per_page=1`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        return null;
      }

      const commits: GitHubApiCommit[] = await response.json() as GitHubApiCommit[];

      if (commits.length > 0) {
        return commits[0].commit.author.date;
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch last commit for ${repoName}:`, error);
      return null;
    }
  }

  /**
   * Check if repository has a README file
   * 
   * Requirement: 53.3
   */
  private static async checkForReadme(
    username: string,
    repoName: string,
    githubToken: string | undefined
  ): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Zenith-App',
      };

      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
      }

      const response = await fetch(
        `https://api.github.com/repos/${username}/${repoName}/readme`,
        {
          method: 'GET',
          headers,
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Track active projects with completion percentage
   * 
   * Requirements: 53.2, 53.3, 53.4, 53.5, 54.4
   */
  private static trackProjects(repos: GitHubRepo[]): ProjectStatus[] {
    const now = new Date();
    const projectStatuses: ProjectStatus[] = [];

    for (const repo of repos) {
      const lastCommitDate = new Date(repo.lastCommitDate);
      const daysInactive = this.calculateDaysInactive(lastCommitDate, now);

      // Determine status (Requirements 53.5, 54.4)
      let status: 'active' | 'abandoned' | 'shipped';
      if (daysInactive > 30) {
        status = 'abandoned';
      } else if (repo.hasLiveDemo && repo.hasReadme && repo.hasCaseStudy) {
        status = 'shipped';
      } else {
        status = 'active';
      }

      // Calculate completion percentage (Requirement 53.2)
      const completionPercentage = this.calculateCompletionPercentage(repo);

      // Identify missing standards (Requirement 53.3)
      const missingStandards: string[] = [];
      if (!repo.hasLiveDemo) missingStandards.push('live demo');
      if (!repo.hasReadme) missingStandards.push('README');
      if (!repo.hasCaseStudy) missingStandards.push('case study');

      projectStatuses.push({
        name: repo.name,
        url: repo.url,
        status,
        completionPercentage,
        lastActivity: repo.lastCommitDate,
        daysInactive,
        missingStandards,
      });
    }

    // Sort by last activity (most recent first)
    projectStatuses.sort((a, b) => {
      const dateA = new Date(a.lastActivity);
      const dateB = new Date(b.lastActivity);
      return dateB.getTime() - dateA.getTime();
    });

    return projectStatuses;
  }

  /**
   * Calculate days inactive since last commit
   */
  private static calculateDaysInactive(lastCommitDate: Date, now: Date): number {
    const diffTime = now.getTime() - lastCommitDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Calculate completion percentage for a project
   * 
   * Requirement: 53.2
   * 
   * Completion criteria:
   * - Live demo: 40%
   * - README: 30%
   * - Case study: 30%
   */
  private static calculateCompletionPercentage(repo: GitHubRepo): number {
    let percentage = 0;

    if (repo.hasLiveDemo) percentage += 40;
    if (repo.hasReadme) percentage += 30;
    if (repo.hasCaseStudy) percentage += 30;

    return percentage;
  }

  /**
   * Calculate started vs shipped ratio
   * 
   * Requirement: 53.4
   */
  private static calculateStartedVsShippedRatio(projects: ProjectStatus[]): string {
    const totalProjects = projects.length;
    const shippedProjects = projects.filter(p => p.status === 'shipped').length;

    if (totalProjects === 0) {
      return '0:0';
    }

    return `${totalProjects}:${shippedProjects}`;
  }

  /**
   * Count shipped projects this month
   */
  private static countShippedThisMonth(projects: ProjectStatus[]): number {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return projects.filter(project => {
      if (project.status !== 'shipped') return false;

      const lastActivity = new Date(project.lastActivity);
      return lastActivity >= firstDayOfMonth;
    }).length;
  }

  /**
   * Calculate design leverage score
   * 
   * Requirements: 55.1, 55.2
   * 
   * Evaluates projects for:
   * - Visual polish (has live demo)
   * - Responsive design (inferred from description/language)
   * - Accessibility (cannot detect automatically, assume 0)
   * - Design system usage (inferred from description)
   */
  private static calculateDesignLeverageScore(repos: GitHubRepo[]): number {
    if (repos.length === 0) {
      return 0;
    }

    let totalScore = 0;

    for (const repo of repos) {
      let repoScore = 0;

      // Visual polish: has live demo (40 points)
      if (repo.hasLiveDemo) {
        repoScore += 40;
      }

      // Responsive design: check description for keywords (30 points)
      const description = (repo.description || '').toLowerCase();
      if (
        description.includes('responsive') ||
        description.includes('mobile') ||
        description.includes('react native') ||
        description.includes('tailwind')
      ) {
        repoScore += 30;
      }

      // Design system usage: check description for keywords (30 points)
      if (
        description.includes('design system') ||
        description.includes('component library') ||
        description.includes('ui kit') ||
        description.includes('styled')
      ) {
        repoScore += 30;
      }

      totalScore += repoScore;
    }

    // Average score across all repos
    const averageScore = totalScore / repos.length;

    return Math.round(averageScore);
  }

  /**
   * Generate suggested next build using Gemini API
   * 
   * Requirements: 53.7, 55.4
   */
  private static async generateSuggestedNextBuild(
    userInput: string,
    projects: ProjectStatus[],
    designLeverageScore: number,
    repos: GitHubRepo[]
  ): Promise<string> {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = `forge:next_build:${projects.length}:${designLeverageScore}`;
      const cached = await CacheService.getCachedGeminiResponse<string>(cacheKey);

      if (cached) {
        console.log('✅ Suggested next build served from cache');
        return cached;
      }

      // Call Gemini API
      const suggestion = await this.callGeminiForNextBuild(
        userInput,
        projects,
        designLeverageScore,
        repos
      );

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, suggestion);

      return suggestion;
    } catch (error) {
      console.error('Failed to generate suggested next build:', error);

      // Return default suggestion if Gemini fails
      return this.getDefaultNextBuild(designLeverageScore, projects);
    }
  }

  /**
   * Generate accountability message using Gemini API
   * 
   * Requirements: 53.1, 53.7, 55.3
   */
  private static async generateAccountabilityMessage(
    projects: ProjectStatus[],
    startedVsShippedRatio: string,
    designLeverageScore: number,
    userDesignExperience: number
  ): Promise<string> {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = `forge:accountability:${startedVsShippedRatio}:${designLeverageScore}`;
      const cached = await CacheService.getCachedGeminiResponse<string>(cacheKey);

      if (cached) {
        console.log('✅ Accountability message served from cache');
        return cached;
      }

      // Call Gemini API
      const message = await this.callGeminiForAccountabilityMessage(
        projects,
        startedVsShippedRatio,
        designLeverageScore,
        userDesignExperience
      );

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, message);

      return message;
    } catch (error) {
      console.error('Failed to generate accountability message:', error);

      // Return default message if Gemini fails
      return this.getDefaultAccountabilityMessage(projects, startedVsShippedRatio, designLeverageScore);
    }
  }

  /**
   * Call Gemini API to generate suggested next build
   * 
   * Requirements: 53.7, 55.4, 60.1
   */
  private static async callGeminiForNextBuild(
    userInput: string,
    projects: ProjectStatus[],
    designLeverageScore: number,
    repos: GitHubRepo[]
  ): Promise<string> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt with relentless tech lead persona (Requirement 53.1)
    const prompt = this.buildNextBuildPrompt(userInput, projects, designLeverageScore, repos);

    // Call Gemini API with exponential backoff
    const response = await this.callGeminiWithRetry(apiKey, prompt);

    return this.parseNextBuildResponse(response);
  }

  /**
   * Call Gemini API to generate accountability message
   * 
   * Requirements: 53.1, 53.7, 55.3, 60.1
   */
  private static async callGeminiForAccountabilityMessage(
    projects: ProjectStatus[],
    startedVsShippedRatio: string,
    designLeverageScore: number,
    userDesignExperience: number
  ): Promise<string> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt with relentless tech lead persona (Requirements 53.1, 55.3)
    const prompt = this.buildAccountabilityMessagePrompt(
      projects,
      startedVsShippedRatio,
      designLeverageScore,
      userDesignExperience
    );

    // Call Gemini API with exponential backoff
    const response = await this.callGeminiWithRetry(apiKey, prompt);

    return response.trim();
  }

  /**
   * Build prompt for suggested next build generation
   * 
   * Requirements: 53.1, 55.4
   */
  private static buildNextBuildPrompt(
    userInput: string,
    projects: ProjectStatus[],
    designLeverageScore: number,
    repos: GitHubRepo[]
  ): string {
    const abandonedCount = projects.filter(p => p.status === 'abandoned').length;
    const activeCount = projects.filter(p => p.status === 'active').length;
    const shippedCount = projects.filter(p => p.status === 'shipped').length;

    // Get languages used
    const languages = Array.from(new Set(repos.map(r => r.language).filter(Boolean)));

    return `You are FORGE, a relentless tech lead who despises abandoned repos. Your job is to suggest the next project to build based on skill gaps and portfolio needs.

User Input: "${userInput}"

Portfolio Status:
- Active Projects: ${activeCount}
- Shipped Projects: ${shippedCount}
- Abandoned Projects: ${abandonedCount}
- Design Leverage Score: ${designLeverageScore}/100

Languages Used: ${languages.join(', ')}

Recent Projects:
${projects.slice(0, 5).map(p => `- ${p.name} (${p.status}, ${p.completionPercentage}% complete, ${p.daysInactive} days inactive)`).join('\n')}

REQUIREMENTS (Requirements 53.1, 55.4):
- Use relentless tech lead persona who despises abandoned repos
- Suggest design-heavy project if design_leverage_score < 50
- Consider skill gaps based on missing technologies
- Be specific and actionable (include tech stack)
- Maximum 2 sentences

Format:
{
  "suggested_next_build": "Your specific project suggestion here"
}`;
  }

  /**
   * Build prompt for accountability message generation
   * 
   * Requirements: 53.1, 55.3
   */
  private static buildAccountabilityMessagePrompt(
    projects: ProjectStatus[],
    startedVsShippedRatio: string,
    designLeverageScore: number,
    userDesignExperience: number
  ): string {
    const abandonedCount = projects.filter(p => p.status === 'abandoned').length;
    const activeCount = projects.filter(p => p.status === 'active').length;
    const shippedCount = projects.filter(p => p.status === 'shipped').length;

    const abandonedProjects = projects
      .filter(p => p.status === 'abandoned')
      .slice(0, 3)
      .map(p => `${p.name} (${p.daysInactive} days inactive)`);

    return `You are FORGE, a relentless tech lead who despises abandoned repos. Your job is to hold the user accountable for their project portfolio.

Portfolio Status:
- Started vs Shipped Ratio: ${startedVsShippedRatio}
- Active Projects: ${activeCount}
- Shipped Projects: ${shippedCount}
- Abandoned Projects: ${abandonedCount}
- Design Leverage Score: ${designLeverageScore}/100
- User Design Experience: ${userDesignExperience} years

Abandoned Repos:
${abandonedProjects.length > 0 ? abandonedProjects.join('\n') : 'None'}

REQUIREMENTS (Requirements 53.1, 55.3):
- Use harsh, relentless tech lead persona
- Call out abandoned repos directly if any exist
- Reference user's ${userDesignExperience} years graphic design experience
- Demand exceptional UI/UX if design_leverage_score < 70
- Be brutally honest about started vs shipped ratio
- Maximum 3 sentences

Generate the accountability message:`;
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
                temperature: 0.7, // Moderate temperature for varied harsh feedback
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
   * Parse Gemini API response for suggested next build
   */
  private static parseNextBuildResponse(responseText: string): string {
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

      if (!parsed.suggested_next_build || typeof parsed.suggested_next_build !== 'string') {
        throw new Error('Invalid response format');
      }

      return parsed.suggested_next_build;
    } catch (error) {
      console.error('Failed to parse next build response:', error);
      console.error('Response text:', responseText);

      // If JSON parsing fails, try to extract text directly
      return responseText.trim();
    }
  }

  /**
   * Get default suggested next build when Gemini fails
   */
  private static getDefaultNextBuild(
    designLeverageScore: number,
    projects: ProjectStatus[]
  ): string {
    // Suggest design-heavy project if design leverage score is low (Requirement 55.4)
    if (designLeverageScore < 50) {
      return 'Build a design-heavy portfolio showcase with Next.js, Tailwind CSS, and Framer Motion. Your 5 years of design experience is wasted on ugly projects.';
    }

    // Suggest finishing abandoned projects
    const abandonedProjects = projects.filter(p => p.status === 'abandoned');
    if (abandonedProjects.length > 0) {
      return `Finish ${abandonedProjects[0].name} before starting anything new. Abandoned repos are a red flag to employers.`;
    }

    // Default suggestion
    return 'Build a full-stack AI application with React, Node.js, and TensorFlow. Demonstrate end-to-end ML integration.';
  }

  /**
   * Get default accountability message when Gemini fails
   */
  private static getDefaultAccountabilityMessage(
    projects: ProjectStatus[],
    startedVsShippedRatio: string,
    designLeverageScore: number
  ): string {
    const abandonedCount = projects.filter(p => p.status === 'abandoned').length;
    const [started, shipped] = startedVsShippedRatio.split(':').map(Number);

    let message = `Started vs Shipped: ${startedVsShippedRatio}. `;

    if (abandonedCount > 0) {
      message += `${abandonedCount} abandoned repo${abandonedCount > 1 ? 's' : ''} detected. Finish what you start or don't start at all. `;
    }

    if (designLeverageScore < 70) {
      message += `Design leverage score: ${designLeverageScore}/100. Your 5 years of design experience should produce exceptional UI/UX, not mediocre interfaces.`;
    } else if (shipped < started / 2) {
      message += `You're starting projects faster than you're shipping them. This is a pattern of failure.`;
    } else {
      message += `Keep shipping. Consistency beats intensity.`;
    }

    return message;
  }
}
