import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  routeAgentRequest,
  getAgentInteractions,
  getAgentStats,
  operatorAgent,
  sentinelAgent,
  brokerAgent,
  architectAgent,
  forgeAgent,
} from '../controllers/agentController';

const router = Router();

/**
 * All agent routes require authentication
 * Requirement: 64.4
 */

/**
 * POST /api/agents/route
 * 
 * Master Router endpoint - accepts natural language input and returns agent response
 * 
 * Body:
 * - input: string (required) - Natural language text input
 * - context: object (optional) - Additional context data
 * 
 * Requirements: 40.1, 64.4
 */
router.post('/route', authenticate, routeAgentRequest);

/**
 * POST /api/agents/operator
 * 
 * OPERATOR agent endpoint - Life administration and calendar management
 * 
 * Body:
 * - input: string (required) - Natural language text input
 * - calendarEvents: CalendarEvent[] (optional) - Calendar events to analyze
 * - examDates: Exam[] (optional) - Exam dates to track
 * 
 * Requirements: 41.1-41.9, 64.2, 64.4
 */
router.post('/operator', authenticate, operatorAgent);

/**
 * POST /api/agents/sentinel
 * 
 * SENTINEL agent endpoint - Wellness enforcement and health monitoring
 * 
 * Body:
 * - sleepHours: number (required) - Hours of sleep
 * - hydrationML: number (required) - Hydration in milliliters
 * - workoutCompleted: boolean (required) - Whether workout was completed
 * - dietQuality: 'clean' | 'junk' (required) - Diet quality
 * - consecutiveSedentaryDays: number (required) - Number of consecutive sedentary days
 * 
 * Requirements: 43.1-43.8, 44.1-44.5, 45.1-45.5, 81.1-81.4, 64.2, 64.4
 */
router.post('/sentinel', authenticate, sentinelAgent);

/**
 * POST /api/agents/broker
 * 
 * BROKER agent endpoint - Financial intelligence and BDT tracking
 * 
 * Body:
 * - input: string (required) - Natural language text input
 * - balance_bdt: number (required) - Current balance in BDT
 * - income_sources: IncomeSource[] (required) - Income sources array
 * - expenses: Expense[] (required) - Expenses array
 * 
 * Requirements: 46.1-46.9, 47.1-47.5, 48.1-48.5, 80.1-80.4, 64.2, 64.4
 */
router.post('/broker', authenticate, brokerAgent);

/**
 * POST /api/agents/architect
 * 
 * ARCHITECT agent endpoint - Career intelligence and skill gap analysis
 * 
 * Body:
 * - input: string (required) - Natural language text input
 * - completedQuests: Quest[] (required) - Completed quests array
 * - completedSkills: SkillNode[] (required) - Completed skills array
 * - portfolioProjects: Project[] (required) - Portfolio projects array
 * - jobPostingKeywords: string[] (optional) - Job posting keywords for skill gap analysis
 * 
 * Requirements: 49.1-49.8, 50.1-50.5, 51.1-51.5, 52.1-52.5, 82.1-82.4, 89.1-89.5, 64.2, 64.4
 */
router.post('/architect', authenticate, architectAgent);

/**
 * POST /api/agents/forge
 * 
 * FORGE agent endpoint - Project accountability and GitHub tracking
 * 
 * Body:
 * - input: string (required) - Natural language text input
 * - githubUsername: string (required) - GitHub username
 * - githubRepos: GitHubRepo[] (optional) - GitHub repositories array
 * 
 * Requirements: 53.6, 53.7, 64.2, 64.4
 */
router.post('/forge', authenticate, forgeAgent);

/**
 * GET /api/agents/interactions
 * 
 * Get user's agent interaction history
 * 
 * Query params:
 * - limit: number (optional, default: 50, max: 100)
 * - agent: string (optional) - Filter by specific agent
 */
router.get('/interactions', authenticate, getAgentInteractions);

/**
 * GET /api/agents/stats
 * 
 * Get user's agent usage statistics
 */
router.get('/stats', authenticate, getAgentStats);

export default router;
