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
export const sentinelAgent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Validate request body
    const { sleepHours, hydrationML, workoutCompleted, dietQuality, consecutiveSedentaryDays } = req.body;
    
    // Validate required fields
    if (typeof sleepHours !== 'number') {
      throw new AppError(400, 'INVALID_INPUT', 'sleepHours must be a number');
    }
    
    if (typeof hydrationML !== 'number') {
      throw new AppError(400, 'INVALID_INPUT', 'hydrationML must be a number');
    }
    
    if (typeof workoutCompleted !== 'boolean') {
      throw new AppError(400, 'INVALID_INPUT', 'workoutCompleted must be a boolean');
    }
    
    if (dietQuality !== 'clean' && dietQuality !== 'junk') {
      throw new AppError(400, 'INVALID_INPUT', 'dietQuality must be "clean" or "junk"');
    }
    
    if (typeof consecutiveSedentaryDays !== 'number') {
      throw new AppError(400, 'INVALID_INPUT', 'consecutiveSedentaryDays must be a number');
    }

    // Get user ID from authenticated request (Requirement 64.4)
    const userId = req.userId;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    console.log(`💪 Processing SENTINEL request for user ${userId}`);
    console.log(`📊 Health data: sleep=${sleepHours}h, hydration=${hydrationML}ml, workout=${workoutCompleted}, diet=${dietQuality}, sedentary=${consecutiveSedentaryDays}d`);

    // Import SENTINEL agent
    const { SentinelAgent: SentinelImpl } = await import('../services/agents/SentinelAgent');

    // Process through SENTINEL agent
    const result = await SentinelImpl.process({
      userId,
      sleepHours,
      hydrationML,
      workoutCompleted,
      dietQuality,
      consecutiveSedentaryDays,
    });

    const processingTimeMs = Date.now() - startTime;

    // Log interaction to database (Requirement 64.4)
    try {
      await AgentInteraction.create({
        userId,
        agent: 'sentinel',
        input: JSON.stringify({ sleepHours, hydrationML, workoutCompleted, dietQuality, consecutiveSedentaryDays }),
        output: result,
        timestamp: new Date(),
        processingTimeMs,
      });
      
      console.log(`✅ SENTINEL interaction logged (${processingTimeMs}ms)`);
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log SENTINEL interaction:', logError);
    }

    // Return response
    res.json({
      success: true,
      data: {
        agent: 'SENTINEL',
        result,
        processingTimeMs,
      },
    });
  } catch (error) {
    next(error);
  }
};

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
export const brokerAgent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Validate request body
    const { input, balance_bdt, income_sources, expenses } = req.body;
    
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'Input text is required');
    }
    
    if (typeof balance_bdt !== 'number') {
      throw new AppError(400, 'INVALID_INPUT', 'balance_bdt must be a number');
    }
    
    if (!Array.isArray(income_sources)) {
      throw new AppError(400, 'INVALID_INPUT', 'income_sources must be an array');
    }
    
    if (!Array.isArray(expenses)) {
      throw new AppError(400, 'INVALID_INPUT', 'expenses must be an array');
    }

    // Get user ID from authenticated request (Requirement 64.4)
    const userId = req.userId;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    console.log(`💰 Processing BROKER request for user ${userId}`);
    console.log(`📊 Financial data: balance=৳${balance_bdt}, income_sources=${income_sources.length}, expenses=${expenses.length}`);

    // Import BROKER agent
    const { BrokerAgent: BrokerImpl } = await import('../services/agents/BrokerAgent');

    // Process through BROKER agent
    const result = await BrokerImpl.process({
      userId,
      userInput: input,
      balance_bdt,
      income_sources,
      expenses,
    });

    const processingTimeMs = Date.now() - startTime;

    // Log interaction to database (Requirement 64.4)
    try {
      await AgentInteraction.create({
        userId,
        agent: 'broker',
        input,
        output: result,
        timestamp: new Date(),
        processingTimeMs,
      });
      
      console.log(`✅ BROKER interaction logged (${processingTimeMs}ms)`);
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log BROKER interaction:', logError);
    }

    // Return response
    res.json({
      success: true,
      data: {
        agent: 'BROKER',
        result,
        processingTimeMs,
      },
    });
  } catch (error) {
    next(error);
  }
};
