/**
 * AI Agent Services
 * 
 * Placeholder implementations for the 6 specialized AI agents.
 * These will be fully implemented in later tasks.
 * 
 * For now, they return mock responses to enable Master Router testing.
 */

export interface AgentInput {
  userId: string;
  input: string;
  context?: Record<string, any>;
}

export interface AgentOutput {
  agent: string;
  response: string;
  data?: Record<string, any>;
  timestamp: string;
}

/**
 * OPERATOR Agent - Life Administration
 * Handles calendar management, deadlines, scheduling
 * 
 * Requirements: 41.1-41.9, 60.1, 60.7, 64.2, 64.4
 */
export class OperatorAgent {
  static async process(input: AgentInput): Promise<AgentOutput> {
    // Import the full OPERATOR implementation
    const { OperatorAgent: OperatorImpl } = await import('./OperatorAgent');
    
    // Parse context for calendar events and exam dates
    const operatorInput = {
      userId: input.userId,
      userInput: input.input,
      calendarEvents: input.context?.calendarEvents || [],
      examDates: input.context?.examDates || [],
    };

    // Process through OPERATOR agent
    const result = await OperatorImpl.process(operatorInput);

    // Format response with cold C-suite executive persona
    const response = this.formatOperatorResponse(result);

    return {
      agent: 'OPERATOR',
      response,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format OPERATOR response with cold C-suite executive persona
   */
  private static formatOperatorResponse(data: any): string {
    const parts: string[] = [];

    // Priority tasks
    if (data.priority_tasks && data.priority_tasks.length > 0) {
      parts.push('Priority tasks:');
      data.priority_tasks.forEach((task: string, index: number) => {
        parts.push(`${index + 1}. ${task}`);
      });
    }

    // Next deadline
    if (data.next_deadline) {
      parts.push(`\nNext deadline: ${data.next_deadline.name} in ${data.next_deadline.daysRemaining} days.`);
    }

    // Conflicts
    if (data.conflicts_detected && data.conflicts_detected.length > 0) {
      parts.push(`\nScheduling conflicts detected: ${data.conflicts_detected.length}`);
    }

    // Auto-generated quests
    if (data.auto_quests && data.auto_quests.length > 0) {
      parts.push(`\nAuto-generated ${data.auto_quests.length} study quest(s).`);
    }

    // Calendar blocks
    if (data.calendar_blocks && data.calendar_blocks.length > 0) {
      parts.push(`\nTime blocks: ${data.calendar_blocks[0].startTime}-${data.calendar_blocks[0].endTime} (${data.calendar_blocks[0].reason})`);
    }

    return parts.join('\n') || 'No actionable items identified.';
  }
}

/**
 * SENTINEL Agent - Wellness Enforcement
 * Handles health monitoring, sleep tracking, workout tracking
 * 
 * Requirements: 43.1-43.8, 44.1-44.5, 45.1-45.5, 81.1-81.4, 64.2, 64.4
 */
export class SentinelAgent {
  static async process(input: AgentInput): Promise<AgentOutput> {
    // Import the full SENTINEL implementation
    const { SentinelAgent: SentinelImpl } = await import('./SentinelAgent');
    
    // Parse context for health data
    const sentinelInput = {
      userId: input.userId,
      sleepHours: input.context?.sleepHours || 0,
      hydrationML: input.context?.hydrationML || 0,
      workoutCompleted: input.context?.workoutCompleted || false,
      dietQuality: input.context?.dietQuality || 'clean',
      consecutiveSedentaryDays: input.context?.consecutiveSedentaryDays || 0,
    };

    // Process through SENTINEL agent
    const result = await SentinelImpl.process(sentinelInput);

    // Use daily_report as the response
    const response = result.daily_report;

    return {
      agent: 'SENTINEL',
      response,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * BROKER Agent - Financial Intelligence
 * Handles money management, budgeting, BDT currency tracking
 * 
 * Requirements: 46.1-46.9, 47.1-47.5, 48.1-48.5, 80.1-80.4, 64.2, 64.4
 */
export class BrokerAgent {
  static async process(input: AgentInput): Promise<AgentOutput> {
    // Import the full BROKER implementation
    const { BrokerAgent: BrokerImpl } = await import('./BrokerAgent');
    
    // Parse context for financial data
    const brokerInput = {
      userId: input.userId,
      userInput: input.input,
      balance_bdt: input.context?.balance_bdt || 0,
      income_sources: input.context?.income_sources || [],
      expenses: input.context?.expenses || [],
    };

    // Process through BROKER agent
    const result = await BrokerImpl.process(brokerInput);

    // Format response with quantitative analyst persona
    const response = this.formatBrokerResponse(result);

    return {
      agent: 'BROKER',
      response,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format BROKER response with quantitative analyst persona
   */
  private static formatBrokerResponse(data: any): string {
    const parts: string[] = [];

    // Financial summary
    parts.push(`Balance: ৳${this.formatBDT(data.balance_bdt)}`);
    parts.push(`Monthly Income: ৳${this.formatBDT(data.monthly_income_bdt)}`);
    parts.push(`Burn Rate: ৳${this.formatBDT(data.burn_rate_bdt)}/month`);
    parts.push(`Runway: ${data.runway_days === Infinity ? '∞' : data.runway_days} days`);
    parts.push(`Savings Rate: ${data.savings_rate_percent}%`);

    // Exchange rates
    if (data.fx_rates) {
      parts.push(`\nFX Rates${data.fx_rates.is_stale ? ' (stale)' : ''}:`);
      parts.push(`- USD: $${(data.balance_bdt * data.fx_rates.BDT_USD).toFixed(2)}`);
      parts.push(`- EUR: €${(data.balance_bdt * data.fx_rates.BDT_EUR).toFixed(2)}`);
    }

    // Alert
    if (data.alert) {
      parts.push(`\n⚠️ ${data.alert}`);
    }

    // Recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      parts.push('\nRecommendations:');
      data.recommendations.forEach((rec: string, index: number) => {
        parts.push(`${index + 1}. ${rec}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Format BDT amount with Bangladeshi number formatting
   */
  private static formatBDT(amount: number): string {
    const amountStr = Math.round(amount).toString();
    
    if (amountStr.length <= 3) {
      return amountStr;
    }

    const lastThree = amountStr.slice(-3);
    const remaining = amountStr.slice(0, -3);
    
    const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    
    return formatted;
  }
}

/**
 * ARCHITECT Agent - Career Intelligence
 * Handles job search, resume building, skill development
 * 
 * Requirements: 49.1-49.8, 50.1-50.5, 51.1-51.5, 52.1-52.5, 82.1-82.4, 89.1-89.5
 */
export class ArchitectAgent {
  static async process(input: AgentInput): Promise<AgentOutput> {
    // Import the full ARCHITECT implementation
    const { ArchitectAgent: ArchitectImpl } = await import('./ArchitectAgent');
    
    // Parse context for career data
    const architectInput = {
      userId: input.userId,
      userInput: input.input,
      completedQuests: input.context?.completedQuests || [],
      completedSkills: input.context?.completedSkills || [],
      portfolioProjects: input.context?.portfolioProjects || [],
      jobPostingKeywords: input.context?.jobPostingKeywords || [],
    };

    // Process through ARCHITECT agent
    const result = await ArchitectImpl.process(architectInput);

    // Format response with Senior Staff Engineer persona
    const response = this.formatArchitectResponse(result);

    return {
      agent: 'ARCHITECT',
      response,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format ARCHITECT response with Senior Staff Engineer persona
   */
  private static formatArchitectResponse(data: any): string {
    const parts: string[] = [];

    // Career alignment score
    parts.push(`Career Alignment: ${data.career_alignment_score}/100`);

    // Portfolio health
    parts.push(`Portfolio Health: ${data.portfolio_health}/100`);

    // Graduation readiness
    parts.push(`Graduation Readiness: ${data.graduation_readiness_score}/100`);

    // Weekly critical path
    if (data.weekly_critical_path && data.weekly_critical_path.length > 0) {
      parts.push('\nWeekly Critical Path:');
      data.weekly_critical_path.forEach((task: string, index: number) => {
        parts.push(`${index + 1}. ${task}`);
      });
    }

    // Top skill gaps
    if (data.skill_gap_analysis && data.skill_gap_analysis.length > 0) {
      parts.push('\nTop Skill Gaps:');
      data.skill_gap_analysis.slice(0, 3).forEach((gap: any) => {
        parts.push(`- ${gap.skill} (Market Demand: ${gap.marketDemand}, Impact: ${gap.impact})`);
      });
    }

    // Hard truth (MANDATORY - Requirement 52.5)
    if (data.hard_truth) {
      parts.push(`\n${data.hard_truth}`);
    }

    return parts.join('\n');
  }
}

/**
 * FORGE Agent - Project Accountability
 * Handles project tracking, GitHub integration, deployment tracking
 * 
 * Requirements: 53.1-53.7, 54.1-54.6, 55.1-55.5
 */
export class ForgeAgent {
  static async process(input: AgentInput): Promise<AgentOutput> {
    // Import the full FORGE implementation
    const { ForgeAgent: ForgeImpl } = await import('./ForgeAgent');
    
    // Parse context for project data
    const forgeInput = {
      userId: input.userId,
      userInput: input.input,
      githubUsername: input.context?.githubUsername || '',
      githubRepos: input.context?.githubRepos || [],
      userDesignExperience: input.context?.userDesignExperience || 5,
    };

    // Process through FORGE agent
    const result = await ForgeImpl.process(forgeInput);

    // Format response with relentless tech lead persona
    const response = this.formatForgeResponse(result);

    return {
      agent: 'FORGE',
      response,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format FORGE response with relentless tech lead persona
   */
  private static formatForgeResponse(data: any): string {
    const parts: string[] = [];

    // Started vs Shipped ratio
    parts.push(`Started vs Shipped: ${data.started_vs_shipped_ratio}`);

    // Shipped this month
    parts.push(`Shipped This Month: ${data.shipped_this_month}`);

    // Design leverage score
    parts.push(`Design Leverage Score: ${data.design_leverage_score}/100`);

    // Active projects summary
    if (data.active_projects && data.active_projects.length > 0) {
      const activeCount = data.active_projects.filter((p: any) => p.status === 'active').length;
      const abandonedCount = data.active_projects.filter((p: any) => p.status === 'abandoned').length;
      const shippedCount = data.active_projects.filter((p: any) => p.status === 'shipped').length;
      
      parts.push(`\nProjects: ${activeCount} active, ${shippedCount} shipped, ${abandonedCount} abandoned`);

      // List abandoned projects
      if (abandonedCount > 0) {
        const abandoned = data.active_projects.filter((p: any) => p.status === 'abandoned').slice(0, 3);
        parts.push('\nAbandoned Repos:');
        abandoned.forEach((p: any) => {
          parts.push(`- ${p.name} (${p.daysInactive} days inactive)`);
        });
      }
    }

    // Suggested next build
    if (data.suggested_next_build) {
      parts.push(`\nSuggested Next Build: ${data.suggested_next_build}`);
    }

    // Accountability message
    if (data.accountability_message) {
      parts.push(`\n${data.accountability_message}`);
    }

    return parts.join('\n');
  }
}

/**
 * SIGNAL Agent - Market Intelligence
 * Handles job market research, salary data, opportunity discovery
 * 
 * Requirements: 40.9
 */
export class SignalAgent {
  static async process(input: AgentInput): Promise<AgentOutput> {
    // TODO: Implement full SIGNAL agent in Task 35
    return {
      agent: 'SIGNAL',
      response: `[PLACEHOLDER] SIGNAL received: "${input.input}". Full implementation coming in Task 35.`,
      data: {
        market_trends: [],
        salary_data: null,
        opportunities: [],
        industry_insights: '',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
