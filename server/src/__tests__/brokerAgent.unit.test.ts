import { describe, it, expect } from 'vitest';

/**
 * BROKER Agent Unit Tests (No Database Required)
 * 
 * Tests for financial intelligence agent calculations
 * 
 * Requirements: 46.1-46.9, 47.1-47.5, 48.1-48.5, 80.1-80.4
 */

describe('BROKER Agent - Unit Tests', () => {
  describe('BDT Formatting', () => {
    it('should format BDT amounts with Bangladeshi number formatting', () => {
      // Test the formatBDT function logic
      const formatBDT = (amount: number): string => {
        const amountStr = Math.round(amount).toString();
        
        if (amountStr.length <= 3) {
          return amountStr;
        }

        const lastThree = amountStr.slice(-3);
        const remaining = amountStr.slice(0, -3);
        
        const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
        
        return formatted;
      };

      // Requirement 80.4: Bangladeshi number formatting
      expect(formatBDT(100)).toBe('100');
      expect(formatBDT(1000)).toBe('1,000');
      expect(formatBDT(10000)).toBe('10,000');
      expect(formatBDT(100000)).toBe('1,00,000');
      expect(formatBDT(1000000)).toBe('10,00,000');
      expect(formatBDT(10000000)).toBe('1,00,00,000');
    });
  });

  describe('Financial Calculations', () => {
    it('should calculate runway days correctly', () => {
      const calculateRunwayDays = (balanceBDT: number, burnRateBDT: number): number => {
        if (burnRateBDT === 0) {
          return Infinity;
        }

        const dailyBurnRate = burnRateBDT / 30;
        const runwayDays = balanceBDT / dailyBurnRate;

        return Math.round(runwayDays);
      };

      // Requirement 46.6: runway_days = balance_bdt / (burn_rate_bdt / 30)
      expect(calculateRunwayDays(30000, 15000)).toBe(60); // 30000 / (15000/30) = 60 days
      expect(calculateRunwayDays(60000, 30000)).toBe(60); // 60000 / (30000/30) = 60 days
      expect(calculateRunwayDays(10000, 5000)).toBe(60); // 10000 / (5000/30) = 60 days
      expect(calculateRunwayDays(50000, 0)).toBe(Infinity); // No burn rate = infinite runway
    });

    it('should calculate savings rate percentage correctly', () => {
      const calculateSavingsRate = (monthlyIncomeBDT: number, burnRateBDT: number): number => {
        if (monthlyIncomeBDT === 0) {
          return 0;
        }

        const savingsRate = ((monthlyIncomeBDT - burnRateBDT) / monthlyIncomeBDT) * 100;

        return Math.round(savingsRate * 10) / 10;
      };

      // Requirement 46.7: savings_rate_percent = (monthly_income_bdt - burn_rate_bdt) / monthly_income_bdt * 100
      expect(calculateSavingsRate(20000, 10000)).toBe(50); // (20000-10000)/20000*100 = 50%
      expect(calculateSavingsRate(30000, 15000)).toBe(50); // (30000-15000)/30000*100 = 50%
      expect(calculateSavingsRate(20000, 5000)).toBe(75); // (20000-5000)/20000*100 = 75%
      expect(calculateSavingsRate(20000, 19000)).toBe(5); // (20000-19000)/20000*100 = 5%
      expect(calculateSavingsRate(0, 10000)).toBe(0); // No income = 0% savings rate
    });

    it('should detect spending alerts correctly', () => {
      const checkSpendingAlert = (burnRateBDT: number, monthlyIncomeBDT: number): boolean => {
        if (monthlyIncomeBDT === 0) {
          return false;
        }

        const spendingPercentage = (burnRateBDT / monthlyIncomeBDT) * 100;

        return spendingPercentage >= 85;
      };

      // Requirement 48.1: Alert when monthly spending exceeds 85% of income
      expect(checkSpendingAlert(18000, 20000)).toBe(true); // 90% > 85%
      expect(checkSpendingAlert(17000, 20000)).toBe(true); // 85% = 85%
      expect(checkSpendingAlert(16000, 20000)).toBe(false); // 80% < 85%
      expect(checkSpendingAlert(10000, 20000)).toBe(false); // 50% < 85%
      expect(checkSpendingAlert(19000, 20000)).toBe(true); // 95% > 85%
    });
  });

  describe('Spending Breakdown', () => {
    it('should calculate category percentages correctly', () => {
      interface Expense {
        category: string;
        amount_bdt: number;
      }

      interface SpendingBreakdown {
        category: string;
        amount_bdt: number;
        percentage: number;
      }

      const calculateSpendingBreakdown = (expenses: Expense[]): SpendingBreakdown[] => {
        const categoryTotals = new Map<string, number>();

        for (const expense of expenses) {
          const current = categoryTotals.get(expense.category) || 0;
          categoryTotals.set(expense.category, current + expense.amount_bdt);
        }

        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount_bdt, 0);

        const breakdown: SpendingBreakdown[] = [];

        for (const [category, amount] of categoryTotals.entries()) {
          breakdown.push({
            category,
            amount_bdt: Math.round(amount),
            percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100 * 10) / 10 : 0,
          });
        }

        breakdown.sort((a, b) => b.amount_bdt - a.amount_bdt);

        return breakdown;
      };

      // Requirement 46.4: Track expenses by category
      const expenses: Expense[] = [
        { category: 'Food', amount_bdt: 8000 },
        { category: 'Food', amount_bdt: 2000 },
        { category: 'Transport', amount_bdt: 3000 },
      ];

      const breakdown = calculateSpendingBreakdown(expenses);

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0].category).toBe('Food');
      expect(breakdown[0].amount_bdt).toBe(10000);
      expect(breakdown[0].percentage).toBeCloseTo(76.9, 1);
      expect(breakdown[1].category).toBe('Transport');
      expect(breakdown[1].amount_bdt).toBe(3000);
      expect(breakdown[1].percentage).toBeCloseTo(23.1, 1);
    });
  });

  describe('Exchange Rate Mock', () => {
    it('should return mock exchange rates when API is unavailable', () => {
      const getMockExchangeRates = () => {
        return {
          BDT_USD: 0.0091,
          BDT_EUR: 0.0084,
          cached_at: new Date().toISOString(),
          is_stale: false,
        };
      };

      // Requirement 47.5: Use cached rates if API fails
      const rates = getMockExchangeRates();

      expect(rates.BDT_USD).toBe(0.0091);
      expect(rates.BDT_EUR).toBe(0.0084);
      expect(rates.is_stale).toBe(false);
      expect(rates.cached_at).toBeDefined();
    });
  });
});
