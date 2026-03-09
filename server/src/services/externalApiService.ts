import { CacheService } from './cacheService';

/**
 * Example service demonstrating how to use Redis caching with external APIs
 */

// ===== Gemini API Service =====

export interface GeminiRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GeminiResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class GeminiApiService {
  /**
   * Call Gemini API with caching (1 hour TTL)
   */
  static async generateText(request: GeminiRequest): Promise<GeminiResponse> {
    // Check cache first
    const cached = await CacheService.getCachedGeminiResponse<GeminiResponse>(request.prompt);
    
    if (cached) {
      console.log('✅ Gemini response served from cache');
      return cached;
    }

    // Cache miss - call actual API
    console.log('🔄 Calling Gemini API...');
    const response = await this.callGeminiApi(request);

    // Cache the response
    await CacheService.cacheGeminiResponse(request.prompt, response);

    return response;
  }

  /**
   * Actual Gemini API call (placeholder - implement with real API)
   */
  private static async callGeminiApi(_request: GeminiRequest): Promise<GeminiResponse> {
    // TODO: Implement actual Gemini API call
    // This is a placeholder implementation
    return {
      text: 'Gemini API response placeholder',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };
  }
}

// ===== GitHub API Service =====

export interface GitHubUser {
  login: string;
  name: string;
  bio: string;
  publicRepos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  url: string;
}

export class GitHubApiService {
  /**
   * Get GitHub user profile with caching (6 hours TTL)
   */
  static async getUserProfile(username: string): Promise<GitHubUser> {
    const endpoint = `/users/${username}`;
    
    // Check cache first
    const cached = await CacheService.getCachedGitHubResponse<GitHubUser>(endpoint);
    
    if (cached) {
      console.log(`✅ GitHub user profile for ${username} served from cache`);
      return cached;
    }

    // Cache miss - call actual API
    console.log(`🔄 Calling GitHub API for user: ${username}`);
    const response = await this.callGitHubApi<GitHubUser>(endpoint);

    // Cache the response
    await CacheService.cacheGitHubResponse(endpoint, response);

    return response;
  }

  /**
   * Get user repositories with caching (6 hours TTL)
   */
  static async getUserRepos(username: string): Promise<GitHubRepo[]> {
    const endpoint = `/users/${username}/repos`;
    
    // Check cache first
    const cached = await CacheService.getCachedGitHubResponse<GitHubRepo[]>(endpoint);
    
    if (cached) {
      console.log(`✅ GitHub repos for ${username} served from cache`);
      return cached;
    }

    // Cache miss - call actual API
    console.log(`🔄 Calling GitHub API for repos: ${username}`);
    const response = await this.callGitHubApi<GitHubRepo[]>(endpoint);

    // Cache the response
    await CacheService.cacheGitHubResponse(endpoint, response);

    return response;
  }

  /**
   * Actual GitHub API call (placeholder - implement with real API)
   */
  private static async callGitHubApi<T>(_endpoint: string): Promise<T> {
    // TODO: Implement actual GitHub API call using fetch or axios
    // This is a placeholder implementation
    throw new Error('GitHub API not implemented yet');
  }
}

// ===== Exchange Rate API Service =====

export interface ExchangeRate {
  base: string;
  target: string;
  rate: number;
  timestamp: string;
}

export class ExchangeRateApiService {
  /**
   * Get exchange rate with caching (6 hours TTL)
   */
  static async getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
    const currencyPair = `${from}_${to}`;
    
    // Check cache first
    const cached = await CacheService.getCachedExchangeRate<ExchangeRate>(currencyPair);
    
    if (cached) {
      console.log(`✅ Exchange rate ${from}/${to} served from cache`);
      return cached;
    }

    // Cache miss - call actual API
    console.log(`🔄 Calling Exchange Rate API for ${from}/${to}`);
    const response = await this.callExchangeRateApi(from, to);

    // Cache the response
    await CacheService.cacheExchangeRate(currencyPair, response);

    return response;
  }

  /**
   * Get BDT exchange rates (Bangladesh Taka - primary currency for this app)
   */
  static async getBDTRate(targetCurrency: string): Promise<ExchangeRate> {
    return this.getExchangeRate('BDT', targetCurrency);
  }

  /**
   * Actual Exchange Rate API call (placeholder - implement with real API)
   */
  private static async callExchangeRateApi(from: string, to: string): Promise<ExchangeRate> {
    // TODO: Implement actual Exchange Rate API call
    // This is a placeholder implementation
    return {
      base: from,
      target: to,
      rate: 1.0,
      timestamp: new Date().toISOString(),
    };
  }
}

// ===== Session Management Service =====

export interface UserSession {
  userId: string;
  email: string;
  lastActivity: string;
  deviceInfo?: string;
}

export class SessionService {
  /**
   * Create or update user session
   */
  static async createSession(sessionId: string, data: UserSession): Promise<void> {
    await CacheService.setSession(sessionId, data);
    console.log(`✅ Session created for user: ${data.userId}`);
  }

  /**
   * Get user session
   */
  static async getSession(sessionId: string): Promise<UserSession | null> {
    const session = await CacheService.getSession<UserSession>(sessionId);
    
    if (session) {
      // Extend session TTL on access
      await CacheService.extendSession(sessionId);
    }
    
    return session;
  }

  /**
   * Delete user session (logout)
   */
  static async deleteSession(sessionId: string): Promise<void> {
    await CacheService.deleteSession(sessionId);
    console.log(`✅ Session deleted: ${sessionId}`);
  }

  /**
   * Validate session and return user data
   */
  static async validateSession(sessionId: string): Promise<UserSession | null> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is still valid (additional validation can be added here)
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    // If more than 24 hours of inactivity, invalidate session
    if (hoursSinceActivity > 24) {
      await this.deleteSession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = now.toISOString();
    await CacheService.setSession(sessionId, session);

    return session;
  }
}
