import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AgentDispatcher } from '../services/AgentDispatcher';
import { AgentInteraction } from '../models/AgentInteraction';
import { AppError } from '../middleware/errorHandler';
import { OperatorAgent as OperatorImpl } from '../services/agents/OperatorAgent';

/**
 * Agent Controller
 * Handles all AI agent-related endpoints
 */

/**
 * POST /api/agents/route
 * 
 * Master Router endpoint - accepts natural language input and returns agent response
 * 
 * Requirements: 40.1, 64.4
 */
export const routeAgentRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Validate request body
    const { input, context } = req.body;
    
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'Input text is required');
    }

    // Get user ID from authenticated request
    const userId = req.userId;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    console.log(`🚀 Processing agent request for user ${userId}`);
    console.log(`📝 Input: ${input}`);

    // Process input through Master Router and agent dispatch
    const result = await AgentDispatcher.processInput(userId, input, context);

    const processingTimeMs = Date.now() - startTime;

    // Log interaction to database
    // Requirement: 64.4
    try {
      await AgentInteraction.create({
        userId,
        agent: result.agent.toLowerCase() as any, // Convert to lowercase for enum
        input,
        output: result,
        timestamp: new Date(),
        processingTimeMs,
      });
      
      console.log(`✅ Agent interaction logged (${processingTimeMs}ms)`);
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log agent interaction:', logError);
    }

    // Return response
    res.json({
      success: true,
      data: {
        agent: result.agent,
        intent: result.intent,
        confidence: result.confidence,
        response: result.response,
        data: result.data,
        timestamp: result.timestamp,
        processingTimeMs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/agents/interactions
 * 
 * Get user's agent interaction history
 * 
 * Query params:
 * - limit: number of interactions to return (default: 50, max: 100)
 * - agent: filter by specific agent (optional)
 */
export const getAgentInteractions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const agent = req.query.agent as string | undefined;

    // Build query
    const query: any = { userId };
    
    if (agent) {
      query.agent = agent.toLowerCase();
    }

    // Fetch interactions
    const interactions = await AgentInteraction.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('-__v')
      .lean();

    res.json({
      success: true,
      data: {
        interactions,
        count: interactions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/agents/stats
 * 
 * Get user's agent usage statistics
 */
export const getAgentStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Get total interactions
    const totalInteractions = await AgentInteraction.countDocuments({ userId });

    // Get interactions by agent
    const interactionsByAgent = await AgentInteraction.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$agent',
          count: { $sum: 1 },
          avgProcessingTime: { $avg: '$processingTimeMs' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentInteractions = await AgentInteraction.countDocuments({
      userId,
      timestamp: { $gte: sevenDaysAgo },
    });

    res.json({
      success: true,
      data: {
        totalInteractions,
        recentInteractions,
        interactionsByAgent: interactionsByAgent.map((item) => ({
          agent: item._id,
          count: item.count,
          avgProcessingTimeMs: Math.round(item.avgProcessingTime || 0),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

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
export const operatorAgent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Validate request body
    const { input, calendarEvents, examDates } = req.body;
    
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'Input text is required');
    }

    // Get user ID from authenticated request (Requirement 64.4)
    const userId = req.userId;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    console.log(`🔧 Processing OPERATOR request for user ${userId}`);
    console.log(`📝 Input: ${input}`);

    // Process through OPERATOR agent
    const result = await OperatorImpl.process({
      userId,
      userInput: input,
      calendarEvents: calendarEvents || [],
      examDates: examDates || [],
    });

    const processingTimeMs = Date.now() - startTime;

    // Log interaction to database (Requirement 64.4)
    try {
      await AgentInteraction.create({
        userId,
        agent: 'operator',
        input,
        output: result,
        timestamp: new Date(),
        processingTimeMs,
      });
      
      console.log(`✅ OPERATOR interaction logged (${processingTimeMs}ms)`);
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log OPERATOR interaction:', logError);
    }

    // Return response
    res.json({
      success: true,
      data: {
        agent: 'OPERATOR',
        result,
        processingTimeMs,
      },
    });
  } catch (error) {
    next(error);
  }
};
