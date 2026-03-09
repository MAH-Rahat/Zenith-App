/**
 * EXPTracker.integration.test.tsx
 * 
 * Integration tests for EXPTracker component wired to EXPSystem
 * Tests that EXPTracker updates when EXP is awarded via EXPSystem
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

describe('EXPTracker Integration with EXPSystem', () => {
  beforeAll(async () => {
    await databaseManager.init();
  });

  beforeEach(async () => {
    // Reset user profile to default state
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

  it('should update display when EXP is awarded via expSystem', async () => {
    const onEXPChange = jest.fn();
    const { getByText } = render(<EXPTracker onEXPChange={onEXPChange} />);

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('0')).toBeTruthy(); // Initial totalEXP
    });

    // Award EXP via expSystem
    await expSystem.awardEXP(50, 'academic_task');

    // Wait for EXPTracker to update via listener
    await waitFor(() => {
      expect(getByText('50')).toBeTruthy(); // Updated totalEXP
    });

    // Verify callback was called
    expect(onEXPChange).toHaveBeenCalledWith(50, 50, 0, 'Script Novice');
  });

  it('should trigger level-up callback when level increases', async () => {
    const onLevelUp = jest.fn();
    const { getByText } = render(<EXPTracker onLevelUp={onLevelUp} />);

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('0')).toBeTruthy();
    });

    // Award enough EXP to level up (100 EXP = level 1)
    await expSystem.awardEXP(100, 'project_deployed');

    // Wait for level update
    await waitFor(() => {
      expect(getByText('1')).toBeTruthy(); // Level should be 1
    });

    // Verify level-up callback was called
    expect(onLevelUp).toHaveBeenCalledWith(1, 'Script Novice');
  });

  it('should trigger rank-up callback when rank changes', async () => {
    const onLevelUp = jest.fn();
    const { getByText } = render(<EXPTracker onLevelUp={onLevelUp} />);

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('Script Novice')).toBeTruthy();
    });

    // Award enough EXP to reach level 5 (Function Apprentice)
    await expSystem.awardEXP(500, 'project_deployed');

    // Wait for rank update
    await waitFor(() => {
      expect(getByText('Function Apprentice')).toBeTruthy();
    });

    // Verify level-up callback was called with new rank
    expect(onLevelUp).toHaveBeenCalledWith(5, 'Function Apprentice');
  });

  it('should update multiple times for multiple EXP awards', async () => {
    const onEXPChange = jest.fn();
    const { getByText } = render(<EXPTracker onEXPChange={onEXPChange} />);

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('0')).toBeTruthy();
    });

    // Award EXP multiple times
    await expSystem.awardEXP(10, 'academic_task');
    await waitFor(() => {
      expect(getByText('10')).toBeTruthy();
    });

    await expSystem.awardEXP(20, 'coding_quest');
    await waitFor(() => {
      expect(getByText('30')).toBeTruthy();
    });

    await expSystem.awardEXP(30, 'academic_task');
    await waitFor(() => {
      expect(getByText('60')).toBeTruthy();
    });

    // Verify callback was called 3 times
    expect(onEXPChange).toHaveBeenCalledTimes(3);
  });

  it('should handle negative EXP (penalties)', async () => {
    const { getByText } = render(<EXPTracker />);

    // Award some EXP first
    await expSystem.awardEXP(50, 'project_deployed');
    await waitFor(() => {
      expect(getByText('50')).toBeTruthy();
    });

    // Apply penalty
    await expSystem.awardEXP(-5, 'pomodoro_failure');
    await waitFor(() => {
      expect(getByText('45')).toBeTruthy();
    });
  });
});
