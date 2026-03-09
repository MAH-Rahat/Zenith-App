import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrokerAgent, BrokerInput } from '../services/agents/BrokerAgent';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { connectRedis, disconnectRedis } from '../config/redis';

/**
 * BROKER Agent Tests
 * 
 * Tests for financial intelligence agent with BDT currency tracking
 * 
 * Requirements: 46.1-46.9, 47.1-47.5, 48.1-48.5, 80.1-80.4
 */

describe('BROKER Agent', () => {
  beforeAll(async () => {
    // Connect to test database and Redis
    await connectDatabase();
    await connectRedis();
  });

  afterAll(async () => {
    // Disconnect from database and Redis
    await disconnectDatabase();
    await disconnectRedis();
  });

  describe('Financial Calculations', () => {
    it('should calculate monthly income from income sources', async () => {
      const input: BrokerInput = {
        userId: '507f1f77bcf86cd799439011',
        userInput: 'Show me my financial status',
        balance_bdt: 50000,
        income_sources: [
          {
            source: 'tutoring',
            amount_bdt: 15000,
            date: new Date().toISOString(),
          },
          {
            source: 'freelance',
            amount_bdt: 25000,
            date: new Date().toISOString(),
          },
        ],
        expenses: [],
      };

      const result = await BrokerAgent.process(input);

      expect(result.monthly_income_bdt).toBe(40000);
      expect(result.balance_bdt).toBe(50000);
    });

    it('should calculate burn rate from expenses', async () => {
      const input: BrokerInput = {
        userId: '507f1f77bcf86cd799439011',
        userInput: 'Show me my spending',
        balance_bdt: 50000,
        income_sources: [],
        expenses: [
          {
            category: 'Food',
            amount_bdt: 8000,
            date: new Date().toISOString(),
          },
          {
            category: 'Transport',
            amount_bdt: 3000,
            date: new Date().toISOString(),
          },
          {
            category: 'Entertainment',
            amount_bdt: 2000,
            date: new Date().toISOString(),
          },
        ],
      };

      const result = await BrokerAgent.process(input);

      expect(result.burn_rate_bdt).toBe(13000);
    });

    it('should calculate runway days correctly', async () => {
      const input: BrokerInput = {
        userId: '507f1f77bcf86cd799439011',
        userInput: 'How long can I survive?',
        balance_bdt: 30000,
        income_sources: [],
        expenses: [
          {
            category: 'Food',
            amount_bdt: 15000,
            date: new Date().toISOString(),
          },
        ],
      };

      const result = await BrokerAgent.process(input);

      // 30000 / (15000 / 30) = 30000 / 500 = 60 days
      expect(result.runway_days).toBe(60);
    });

    it('should calculate savings rate percentage', async () => {
      const input: BrokerInput = {
        userId: '507f1f77bcf86cd799439011',
        userInput: 'What is my savings rate?',
        balance_bdt: 50000,
        income_sources: [
          {
            source: 'tutoring',
            amount_bdt: 20000,
            date: new Date().toISOString(),
          },
        ],
        expenses: [
          {
            category: 'Food',
            amount_bdt: 10000,
            date: new Date().toISOString(),
          },
        ],
      };

      const result = await BrokerAgent.process(input);

      // (20000 - 10000) / 20000 * 100 = 50%
      expect(result.savings_rate_percent).toBe(50);
    });
  });

  describe('Spending Breakdown', () => {
    it('should categorize expenses correctly', async () => {
      const input: BrokerInput = {
        userId: '507f1f77bcf86cd799439011',
        userInput: 'Show spending breakdown',
        balance_bdt: 50000,
        income_sources: [],
        expenses: [
          {
            category: 'Food',
            amount_bdt: 8000,
            date: new Date().toISOString(),
          },
          {
            category: 'Food',
            amount_bdt: 2000,
            date: new Date().toISOString(),
          },
          {
            category: 'Transport',
            amount_bdt: 3000,
            date: new Date().toISOString(),
          },
        ],
      };

      const result = await BrokerAgent.process(input);

      expect(result.spending_breakdown).toHaveLength(2);
      
      const foodCategory = result.spending_breakdown.find(s => s.category === 'Food');
      expect(foodCategory?.amount_bdt).toBe(10000);
      expect(foodCategory?.percentage).toBeCloseTo(76.9, 1);

      const transportCategory = result.spending_breakdown.find(s => s.category === 'Transport');
      expect(transportCategory?.amount_bdt).toBe(3000);
      expect(transportCategory?.percentage).toBeCloseTo(23.1, 1);
    });
  });

  describe('Spending Alerts', () => {
    it('should trigger alert when spending exceeds 85% of income', async () => {
      const input: BrokerInput = {
        userId: '507f1f77bcf86cd799439011',
        userInput: 'Check my finances',
        balance_bdt: 10000,
        income_sources: [
          {
            source: 'tutoring',
            amount_bdt: 20000,
            date: new Date().toISOString(),
          },
        ],
        expenses: [
          {
            category: 'Food',
            amount_bdt: 18000,
            date: new Date().toISOString(),
          },
        ],
      };

      const result = await BrokerAgent.process(input);

      // 18000 / 20000 = 90% > 85%
      expect(result.alert).toBeTruthy();
      expect(result.alert).toContain('ALERT');
      expect(result.alert).toContain('90%');
    });

    it('should not trigger alert when spending is below 85%', async () => {
      const input: BrokerInput = {
        userId: '507f1f77bcf86cd799439011',
        userInput: 'Check my finances',
        balance_bdt: 50000,
        income_sources: [
          {
            source: 'tutoring',
            amount_bdt: 20000,
            date: new Date().toISOString(),
          },
        ],
        expenses: [
          {
            category: 'Food',
            amount_bdt: 10000,
            date: new Date().toISOString(),
          },
        ],
      };

      const result = await BrokerAgent.process(input);

      // 10000 / 20000 = 50% < 85%
      expect(result.alert).toBeNull();
    });
  });

  describe('Exchange Rates', () => {
    it('should return exchange rates for BDT to USD and EUR', async () => {
      const input: BrokerInput = {
        userId: '507f1f77bcf86cd799439011',
        userInput: 'Show exchange rates',
        balance_bdt: 100000,
        income_sources: [],
        expenses: [],
      };

      const result = await BrokerAgent.process(input);

      expect(result.fx_rates).toBeDefined();
      expect(result.fx_rates.BDT_USD).toBeGreaterThan(0);
      expect(result.fx_rates.BDT_EUR).toBeGreaterThan(0);
      expect(result.fx_rates.cached_at).toBeDefined();
      expect(typeof result.fx_rates.is_stale).toBe('boolean');
    });
  });

  describe('Output Format', () => {
    it('should return all required fields in output', async () => {
      const input: BrokerInput = {
        userId: '507f1f77bcf86cd799439011',
        userInput: 'Financial summary',
        balance_bdt: 50000,
        income_sources: [
          {
            source: 'tutoring',
            amount_bdt: 20000,
            date: new Date().toISOString(),
          },
        ],
        expenses: [
          {
            category: 'Food',
            amount_bdt: 10000,
            date: new Date().toISOString(),
          },
        ],
      };

      const result = await BrokerAgent.process(input);

      // Requirement 46.8: Output JSON with all required fields
      expect(result).toHaveProperty('balance_bdt');
      expect(result).toHaveProperty('monthly_income_bdt');
      expect(result).toHaveProperty('burn_rate_bdt');
      expect(result).toHaveProperty('runway_days');
      expect(result).toHaveProperty('savings_rate_percent');
      expect(result).toHaveProperty('fx_rates');
      expect(result).toHaveProperty('alert');
      expect(result).toHaveProperty('spending_breakdown');
      expect(result).toHaveProperty('recommendations');
    });
  });
});
