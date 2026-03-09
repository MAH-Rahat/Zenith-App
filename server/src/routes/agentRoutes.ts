import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  routeAgentRequest,
  getAgentInteractions,
  getAgentStats,
  operatorAgent,
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
