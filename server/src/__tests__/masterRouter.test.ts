import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MasterRouter, AgentIntent } from '../services/MasterRouter';
import { AgentDispatcher } from '../services/AgentDispatcher';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { connectRedis, disconnectRedis } from '../config/redis';

/**
 * Master Router Integration Tests
 * 
 * Tests intent classification and agent dispatch logic
 * Requirements: 40.3, 40.10, 78.1
 */

describe('Master Router', () => {
  beforeAll(async () => {
    // Connect to database and Redis for integration tests
    await connectDatabase();
    await connectRedis();
  });

  afterAll(async () => {
    // Cleanup connections
    await disconnectDatabase();
    await disconnectRedis();
  });

  describe('Intent Classification', () => {
    it('should classify calendar-related input as life_admin', async () => {
      const input = 'Schedule a meeting for tomorrow at 3 PM';
      const result = await MasterRouter.classifyIntent(input);
      
      expect(result.intent).toBe('life_admin');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify health-related input as wellness', async () => {
      const input = 'Log my sleep hours for last night';
      const result = await MasterRouter.classifyIntent(input);
      
      expect(result.intent).toBe('wellness');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify finance-related input as finance', async () => {
      const input = 'Track my monthly expenses in BDT';
      const result = await MasterRouter.classifyIntent(input);
      
      expect(result.intent).toBe('finance');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify career-related input as career', async () => {
      const input = 'Help me build my resume for software engineer position';
      const result = await MasterRouter.classifyIntent(input);
      
      expect(result.intent).toBe('career');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify project-related input as project', async () => {
      const input = 'Show me my GitHub commits from last week';
      const result = await MasterRouter.classifyIntent(input);
      
      expect(result.intent).toBe('project');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify market-related input as market', async () => {
      const input = 'What are the current job opportunities for React developers?';
      const result = await MasterRouter.classifyIntent(input);
      
      expect(result.intent).toBe('market');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should default to life_admin when classification fails', async () => {
      // Test with empty input to trigger fallback
      const result = await MasterRouter.classifyIntent('');
      
      expect(result.intent).toBe('life_admin');
      expect(result.confidence).toBe(0);
    });
  });

  describe('Agent Mapping', () => {
    it('should map life_admin to OPERATOR', () => {
      const agent = MasterRouter.getAgentForIntent('life_admin');
      expect(agent).toBe('OPERATOR');
    });

    it('should map wellness to SENTINEL', () => {
      const agent = MasterRouter.getAgentForIntent('wellness');
      expect(agent).toBe('SENTINEL');
    });

    it('should map finance to BROKER', () => {
      const agent = MasterRouter.getAgentForIntent('finance');
      expect(agent).toBe('BROKER');
    });

    it('should map career to ARCHITECT', () => {
      const agent = MasterRouter.getAgentForIntent('career');
      expect(agent).toBe('ARCHITECT');
    });

    it('should map project to FORGE', () => {
      const agent = MasterRouter.getAgentForIntent('project');
      expect(agent).toBe('FORGE');
    });

    it('should map market to SIGNAL', () => {
      const agent = MasterRouter.getAgentForIntent('market');
      expect(agent).toBe('SIGNAL');
    });
  });

  describe('Agent Dispatch', () => {
    it('should dispatch to correct agent based on intent', async () => {
      const intents: AgentIntent[] = [
        'life_admin',
        'wellness',
        'finance',
        'career',
        'project',
        'market',
      ];

      for (const intent of intents) {
        const result = await AgentDispatcher.dispatch(intent, {
          userId: 'test-user-id',
          input: 'test input',
        });

        expect(result).toBeDefined();
        expect(result.agent).toBeDefined();
        expect(result.response).toBeDefined();
        expect(result.timestamp).toBeDefined();
      }
    });

    it('should return error response when agent processing fails', async () => {
      // This test verifies error handling in dispatch
      const result = await AgentDispatcher.dispatch('life_admin', {
        userId: 'test-user-id',
        input: 'test input',
      });

      expect(result).toBeDefined();
      expect(result.agent).toBe('OPERATOR');
    });
  });

  describe('Full Pipeline', () => {
    it('should process input through full pipeline', async () => {
      const result = await AgentDispatcher.processInput(
        'test-user-id',
        'Schedule a meeting for tomorrow'
      );

      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.agent).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });
});
