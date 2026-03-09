import { CacheService } from './cacheService';

/**
 * GitHub REST API v3 Service
 * 
 * Provides GitHub integration for proof-of-work validation and commit streak tracking.
 * 
 * Requirements: 61.1, 61.2, 61.3, 61.4, 61.5, 61.6
 */

// ===== Interfaces =====

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubCommitActivity {
  date: string;
  commitCount: number;
}

export interface GitHubCommitStreak {
  currentStreak: number;
  longestStreak: number;
  totalCommits: number;
  recentActivity: GitHubCommitActivity[];
}

export interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubURLValidation {
  isValid: boolean;
  username?: string;
  repository?: string;
  error?: string;
}

// ===== GitHub Service Class =====

export class GitHubService {
  private static readonly BASE_URL = 'https://api.github.com';
  private static readonly CACHE_TTL_HOURS = 6;

  /**
   * Authenticate and validate GitHub personal access token
   * 
   * Requirement: 61.2
   */
  static async authenticateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/user`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Zenith-App',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('GitHub token authentication failed:', error);
      return false;
    }
  }

  /**
   * Fetch user repositories
   * 
   * Requirement: 61.1
   */
  static async fetchUserRepositories(
    username: string,
    token?: string
  ): Promise<GitHubRepository[]> {
    const endpoint = `/users/${username}/repos`;
    const cacheKey = `github:repos:${username}`;

    // Check cache first (6 hours TTL)
    const cached = await CacheService.getCachedGitHubResponse<GitHubRepository[]>(cacheKey);

    if (cached) {
      console.log(`✅ GitHub repositories for ${username} served from cache`);
      return cached;
    }

    // Cache miss - call GitHub API
    console.log(`🔄 Fetching GitHub repositories for ${username}...`);

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Zenith-App',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${this.BASE_URL}${endpoint}?sort=updated&per_page=100`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const repositories: GitHubRepository[] = await response.json() as GitHubRepository[];

      // Cache the result
      await CacheService.cacheGitHubResponse(cacheKey, repositories);

      return repositories;
    } catch (error) {
      console.error('Failed to fetch GitHub repositories:', error);
      throw error;
    }
  }

  /**
   * Validate GitHub URL format
   * 
   * Requirement: 61.3
   * 
   * Valid formats:
   * - https://github.com/username/repo
   * - https://github.com/username/repo/
   * - https://github.com/username/repo/tree/branch
   * - https://github.com/username/repo/blob/branch/file
   */
  static validateGitHubURL(url: string): GitHubURLValidation {
    try {
      // Remove trailing slash
      const cleanUrl = url.trim().replace(/\/$/, '');

      // Parse URL
      const urlObj = new URL(cleanUrl);

      // Check if it's a GitHub URL
      if (urlObj.hostname !== 'github.com') {
        return {
          isValid: false,
          error: 'URL must be from github.com',
        };
      }

      // Extract path parts
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);

      // Must have at least username and repo
      if (pathParts.length < 2) {
        return {
          isValid: false,
          error: 'URL must include username and repository',
        };
      }

      const [username, repository] = pathParts;

      // Validate username and repository format
      const validPattern = /^[a-zA-Z0-9_-]+$/;

      if (!validPattern.test(username)) {
        return {
          isValid: false,
          error: 'Invalid username format',
        };
      }

      if (!validPattern.test(repository)) {
        return {
          isValid: false,
          error: 'Invalid repository name format',
        };
      }

      return {
        isValid: true,
        username,
        repository,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid URL format',
      };
    }
  }

  /**
   * Fetch commit streak data for Graduation War Room
   * 
   * Requirement: 61.4
   */
  static async fetchCommitStreak(
    username: string,
    token?: string
  ): Promise<GitHubCommitStreak> {
    const cacheKey = `github:streak:${username}`;

    // Check cache first (6 hours TTL)
    const cached = await CacheService.getCachedGitHubResponse<GitHubCommitStreak>(cacheKey);

    if (cached) {
      console.log(`✅ GitHub commit streak for ${username} served from cache`);
      return cached;
    }

    // Cache miss - calculate streak from events
    console.log(`🔄 Calculating GitHub commit streak for ${username}...`);

    try {
      const events = await this.fetchUserEvents(username, token);
      const streak = this.calculateStreakFromEvents(events);

      // Cache the result
      await CacheService.cacheGitHubResponse(cacheKey, streak);

      return streak;
    } catch (error) {
      console.error('Failed to fetch commit streak:', error);
      throw error;
    }
  }

  /**
   * Fetch user events (commits, pushes, etc.)
   * 
   * Internal helper for streak calculation
   */
  private static async fetchUserEvents(
    username: string,
    token?: string
  ): Promise<any[]> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Zenith-App',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${this.BASE_URL}/users/${username}/events?per_page=100`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as any[];
  }

  /**
   * Calculate commit streak from GitHub events
   * 
   * Internal helper for streak calculation
   */
  private static calculateStreakFromEvents(events: any[]): GitHubCommitStreak {
    // Filter for push events (commits)
    const pushEvents = events.filter(event => event.type === 'PushEvent');

    // Extract dates and commit counts
    const commitsByDate = new Map<string, number>();

    for (const event of pushEvents) {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      const commitCount = event.payload?.commits?.length || 1;

      const current = commitsByDate.get(date) || 0;
      commitsByDate.set(date, current + commitCount);
    }

    // Sort dates
    const sortedDates = Array.from(commitsByDate.keys()).sort();

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date(today);

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];

      if (commitsByDate.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const dateStr of sortedDates) {
      const currentDate = new Date(dateStr);

      if (prevDate) {
        const dayDiff = Math.floor(
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }

      prevDate = currentDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate total commits
    const totalCommits = Array.from(commitsByDate.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity: GitHubCommitActivity[] = [];

    for (const [date, count] of commitsByDate.entries()) {
      const dateObj = new Date(date);

      if (dateObj >= thirtyDaysAgo) {
        recentActivity.push({
          date,
          commitCount: count,
        });
      }
    }

    // Sort recent activity by date
    recentActivity.sort((a, b) => a.date.localeCompare(b.date));

    return {
      currentStreak,
      longestStreak,
      totalCommits,
      recentActivity,
    };
  }

  /**
   * Verify repository exists and is accessible
   * 
   * Used for proof-of-work validation
   */
  static async verifyRepository(
    username: string,
    repository: string,
    token?: string
  ): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Zenith-App',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${this.BASE_URL}/repos/${username}/${repository}`,
        {
          method: 'GET',
          headers,
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to verify repository:', error);
      return false;
    }
  }

  /**
   * Get authenticated user information
   * 
   * Used to verify token and get username
   */
  static async getAuthenticatedUser(token: string): Promise<GitHubUser | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/user`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Zenith-App',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json() as GitHubUser;
    } catch (error) {
      console.error('Failed to get authenticated user:', error);
      return null;
    }
  }
}
