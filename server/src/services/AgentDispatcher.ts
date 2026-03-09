import { AgentIntent, MasterRouter } from './MasterRouter';
import {
  AgentInput,
  AgentOutput,
  OperatorAgent,
  SentinelAgent,
  BrokerAgent,
  ArchitectAgent,
  ForgeAgent,
  SignalAgent,
} from './agents';

/**
 * Agent Dispatcher Service
 * - Routes requests to appropriate specialized agent based on intent
 * - Logs all routing decisions to AgentInteraction model
 * 
 * Requirements: 40.4, 40.5, 40.6, 40.7, 40.8, 40.9
 */
export class AgentDispatcher {
  /**
   * Dispatch request to appropriate agent based on intent
   * 
   * @param intent - Classified intent
   * @param input - Agent input data
   * @returns Agent output response
   */
  static async dispatch(intent: AgentIntent, input: AgentInput): Promise<AgentOutput> {
    const agentName = MasterRouter.getAgentForIntent(intent);
    
    console.log(`🎯 Dispatching to ${agentName} agent (intent: ${intent})`);

    try {
      let response: AgentOutput;

      // Route to appropriate agent based on intent
      // Requirements: 40.4, 40.5, 40.6, 40.7, 40.8, 40.9
      switch (intent) {
        case 'life_admin':
          response = await OperatorAgent.process(input);
          break;

        case 'wellness':
          response = await SentinelAgent.process(input);
          break;

        case 'finance':
          response = await BrokerAgent.process(input);
          break;

        case 'career':
          response = await ArchitectAgent.process(input);
          break;

        case 'project':
          response = await ForgeAgent.process(input);
          break;

        case 'market':
          response = await SignalAgent.process(input);
          break;

        default:
          // This should never happen due to TypeScript type checking
          // But handle it gracefully just in case
          console.warn(`Unknown intent: ${intent}, defaulting to OPERATOR`);
          response = await OperatorAgent.process(input);
      }

      return response;
    } catch (error) {
      console.error(`Error dispatching to ${agentName}:`, error);
      
      // Return error response
      return {
        agent: agentName,
        response: `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Process a natural language input through the full pipeline:
   * 1. Classify intent using Master Router
   * 2. Dispatch to appropriate agent
   * 3. Return agent response
   * 
   * @param userId - User ID making the request
   * @param input - Natural language input text
   * @param context - Optional context data
   * @returns Agent output response with intent classification
   */
  static async processInput(
    userId: string,
    input: string,
    context?: Record<string, any>
  ): Promise<AgentOutput & { intent: AgentIntent; confidence: number }> {
    // Step 1: Classify intent
    const classification = await MasterRouter.classifyIntent(input);
    
    console.log(`📊 Intent classification: ${classification.intent} (confidence: ${classification.confidence})`);
    if (classification.reasoning) {
      console.log(`💭 Reasoning: ${classification.reasoning}`);
    }

    // Step 2: Dispatch to agent
    const agentInput: AgentInput = {
      userId,
      input,
      context,
    };

    const agentOutput = await this.dispatch(classification.intent, agentInput);

    // Step 3: Return combined result
    return {
      ...agentOutput,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
}
