/**
 * EXPTracker.test.tsx
 * 
 * Unit tests for EXPTracker component
 * Tests Requirements: 9.1, 9.2, 9.3
 * 
 * Coverage:
 * - Zero EXP display on first launch
 * - Progress bar animation triggers
 * - Level-up animation
 * - Component subscription/unsubscription
 * - EXP change indicators
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { EXPTracker } from '../EXPTracker';
import { expSystem } from '../../services/EXPSystem';
import { databaseManager } from '../../services/DatabaseManager';

// Mock AnimationController to avoid animation issues in tests
jest.mock('../../services/AnimationController', () => ({
  animationController: {
    playRankUpAnimation: jest.fn(),
  },
}));

describe('EXPTracker Unit Tests', () => {
  beforeAll(async () => {
    await databaseManager.init();
  });

  beforeEach(async () => {
    // Reset user profile to default state before each test
    const now = new Date().toISOString();
    const timestamp = Date.now();
    
    await databaseManager.update(
      'user_profile',
      {
        totalEXP: 0,
        dailyEXP: 0,
        level: 0,
        rank: 'Script Novice',
        currentHP: 100,
        health_score: 100,
        lastResetDate: now,
        lastActivityTimestamp: timestamp,
        updatedAt: now,
      },
      'id = 1'
    );
  });

  describe('Requirement 9.1: Zero EXP display on first launch', () => {
    it('should display zero EXP on first launch', async () => {
      const { getByText } = render(<EXPTracker />);

      // Wait for component to load user profile
      await waitFor(() => {
        // Check for total EXP = 0
        const totalEXPElements = getByText('0');
        expect(totalEXPElements).toBeTruthy();
      });
    });

    it('should display level 0 on first launch', async () => {
      const { getAllByText } = render(<EXPTracker />);

      await waitFor(() => {
        // Level should be 0
        const levelElements = getAllByText('0');
        expect(levelElements.length).toBeGreaterThan(0);
      });
    });

    it('should display Script Novice rank on first launch', async () => {
      const { getByText } = render(<EXPTracker />);

      await waitFor(() => {
        expect(getByText('Script Novice')).toBeTruthy();
      });
    });

    it('should display zero daily EXP on first launch', async () => {
      const { getByText } = render(<EXPTracker />);

      await waitFor(() => {
        // Daily EXP should be 0
        expect(getByText('0')).toBeTruthy();
      });
    });

    it('should display progress bar at 0% on first launch', async () => {
      const { getByText } = render(<EXPTracker />);

      await waitFor(() => {
        // Progress should show 0 / 100 EXP (to reach level 1)
        expect(getByText(/0 \/ 100 EXP/)).toBeTruthy();
      });
    });
  });

  describe('Requirement 9.2: Progress bar animation triggers', () => {
    it('should trigger progress bar animation when EXP is awarded', async () => {
      const { getByText } = render(<EXPTracker />);

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('0')).toBeTruthy();
      });

      // Award EXP
      await expSystem.awardEXP(50, 'academic_task');

      // Wait for progress bar to update
      await waitFor(() => {
        // Progress should show 50 / 100 EXP
        expect(getByText(/50 \/ 100 EXP/)).toBeTruthy();
      });
    });

    it('should update progress bar when EXP increases', async () => {
      const { getByText } = render(<EXPTracker />);

      await waitFor(() => {
        expect(getByText('0')).toBeTruthy();
      });

      // Award 25 EXP
      await expSystem.awardEXP(25, 'academic_task');

      await waitFor(() => {
        expect(getByText(/25 \/ 100 EXP/)).toBeTruthy();
      });

      // Award another 25 EXP
      await expSystem.awardEXP(25, 'academic_task');

      await waitFor(() => {
        expect(getByText(/50 \/ 100 EXP/)).toBeTruthy();
      });
    });

    it('should reset progress bar after level-up', async () => {
      const { getByText } = render(<EXPTracker />);

      await waitFor(() => {
        expect(getByText('0')).toBeTruthy();
      });

      // Award 100 EXP to level up
      await expSystem.awardEXP(100, 'project_deployed');

      await waitFor(() => {
        // Level should be 1
    