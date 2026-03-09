/**
 * SkillTree.test.tsx
 * 
 * Unit tests for SkillTree component phase unlock logic
 * 
 * Requirements: 15.3, 15.4, 15.5, 16.3, 16.4, 16.5, 17.3, 17.4, 17.5
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SkillTree } from '../SkillTree';
import { storageManager } from '../../services/StorageManager';

// Mock StorageManager
jest.mock('../../services/StorageManager', () => ({
  storageManager: {
    save: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue(null),
  },
}));

describe('SkillTree Phase Unlock Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with Phase 1 unlocked by default', async () => {
    const { getByText } = render(<SkillTree onSkillComplete={jest.fn()} />);
    
    await waitFor(() => {
      expect(getByText(/Phase 1: MERN Stack/i)).toBeTruthy();
    });
  });

  it('should calculate phase completion percentage correctly', async () => {
    const mockData = {
      skills: [
        // Phase 1 - 4 out of 5 completed (80%)
        { id: 'react-hooks', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'context-zustand', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'nextjs', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'node-express', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'mongodb', phase: 1, isUnlocked: true, isComplete: false },
        // Phase 2 - locked
        { id: 'linux-bash', phase: 2, isUnlocked: false, isComplete: false },
      ],
    };

    (storageManager.load as jest.Mock).mockResolvedValue(mockData);

    const { getByText } = render(<SkillTree onSkillComplete={jest.fn()} />);
    
    await waitFor(() => {
      expect(getByText(/80% Complete/i)).toBeTruthy();
    });
  });

  it('should display unlock requirement message on locked phases', async () => {
    const { getByText } = render(<SkillTree onSkillComplete={jest.fn()} />);
    
    await waitFor(() => {
      expect(getByText(/Unlock at 80% Phase 1/i)).toBeTruthy();
      expect(getByText(/Unlock at 50% Phase 2/i)).toBeTruthy();
      expect(getByText(/Unlock at 100% Phase 3/i)).toBeTruthy();
    });
  });

  it('should unlock Phase 2 when Phase 1 reaches 80%', async () => {
    const mockData = {
      skills: [
        // Phase 1 - 4 out of 5 completed (80%)
        { id: 'react-hooks', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'context-zustand', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'nextjs', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'node-express', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'mongodb', phase: 1, isUnlocked: true, isComplete: false },
        // Phase 2 - should be unlocked
        { id: 'linux-bash', phase: 2, isUnlocked: false, isComplete: false },
        { id: 'git', phase: 2, isUnlocked: false, isComplete: false },
        { id: 'docker', phase: 2, isUnlocked: false, isComplete: false },
        { id: 'cicd', phase: 2, isUnlocked: false, isComplete: false },
        { id: 'aws-vercel', phase: 2, isUnlocked: false, isComplete: false },
      ],
    };

    (storageManager.load as jest.Mock).mockResolvedValue(mockData);

    const { getByText } = render(<SkillTree onSkillComplete={jest.fn()} />);
    
    await waitFor(() => {
      // Phase 1 should show 80% completion
      expect(getByText(/80% Complete/i)).toBeTruthy();
    });
  });

  it('should unlock Phase 3 when Phase 2 reaches 50%', async () => {
    const mockData = {
      skills: [
        // Phase 1 - fully completed
        { id: 'react-hooks', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'context-zustand', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'nextjs', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'node-express', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'mongodb', phase: 1, isUnlocked: true, isComplete: true },
        // Phase 2 - 3 out of 5 completed (60% > 50%)
        { id: 'linux-bash', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'git', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'docker', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'cicd', phase: 2, isUnlocked: true, isComplete: false },
        { id: 'aws-vercel', phase: 2, isUnlocked: true, isComplete: false },
        // Phase 3 - should be unlocked
        { id: 'jwt', phase: 3, isUnlocked: false, isComplete: false },
      ],
    };

    (storageManager.load as jest.Mock).mockResolvedValue(mockData);

    const { getByText } = render(<SkillTree onSkillComplete={jest.fn()} />);
    
    await waitFor(() => {
      // Phase 2 should show 60% completion
      expect(getByText(/60% Complete/i)).toBeTruthy();
    });
  });

  it('should unlock Phase 4 when Phase 3 reaches 100%', async () => {
    const mockData = {
      skills: [
        // Phase 1 - fully completed
        { id: 'react-hooks', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'context-zustand', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'nextjs', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'node-express', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'mongodb', phase: 1, isUnlocked: true, isComplete: true },
        // Phase 2 - fully completed
        { id: 'linux-bash', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'git', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'docker', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'cicd', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'aws-vercel', phase: 2, isUnlocked: true, isComplete: true },
        // Phase 3 - fully completed (100%)
        { id: 'jwt', phase: 3, isUnlocked: true, isComplete: true },
        { id: 'bcrypt', phase: 3, isUnlocked: true, isComplete: true },
        { id: 'owasp-top-10', phase: 3, isUnlocked: true, isComplete: true },
        { id: 'nmap', phase: 3, isUnlocked: true, isComplete: true },
        { id: 'wireshark', phase: 3, isUnlocked: true, isComplete: true },
        // Phase 4 - should be unlocked
        { id: 'python', phase: 4, isUnlocked: false, isComplete: false },
      ],
    };

    (storageManager.load as jest.Mock).mockResolvedValue(mockData);

    const { getByText } = render(<SkillTree onSkillComplete={jest.fn()} />);
    
    await waitFor(() => {
      // Phase 3 should show 100% completion
      expect(getByText(/100% Complete/i)).toBeTruthy();
    });
  });

  it('should not unlock Phase 2 if Phase 1 is below 80%', async () => {
    const mockData = {
      skills: [
        // Phase 1 - 3 out of 5 completed (60% < 80%)
        { id: 'react-hooks', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'context-zustand', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'nextjs', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'node-express', phase: 1, isUnlocked: true, isComplete: false },
        { id: 'mongodb', phase: 1, isUnlocked: true, isComplete: false },
        // Phase 2 - should remain locked
        { id: 'linux-bash', phase: 2, isUnlocked: false, isComplete: false },
      ],
    };

    (storageManager.load as jest.Mock).mockResolvedValue(mockData);

    const { getByText } = render(<SkillTree onSkillComplete={jest.fn()} />);
    
    await waitFor(() => {
      // Phase 1 should show 60% completion
      expect(getByText(/60% Complete/i)).toBeTruthy();
      // Phase 2 should show unlock message
      expect(getByText(/Unlock at 80% Phase 1/i)).toBeTruthy();
    });
  });

  it('should not unlock Phase 3 if Phase 2 is below 50%', async () => {
    const mockData = {
      skills: [
        // Phase 1 - fully completed
        { id: 'react-hooks', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'context-zustand', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'nextjs', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'node-express', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'mongodb', phase: 1, isUnlocked: true, isComplete: true },
        // Phase 2 - 2 out of 5 completed (40% < 50%)
        { id: 'linux-bash', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'git', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'docker', phase: 2, isUnlocked: true, isComplete: false },
        { id: 'cicd', phase: 2, isUnlocked: true, isComplete: false },
        { id: 'aws-vercel', phase: 2, isUnlocked: true, isComplete: false },
        // Phase 3 - should remain locked
        { id: 'jwt', phase: 3, isUnlocked: false, isComplete: false },
      ],
    };

    (storageManager.load as jest.Mock).mockResolvedValue(mockData);

    const { getByText } = render(<SkillTree onSkillComplete={jest.fn()} />);
    
    await waitFor(() => {
      // Phase 2 should show 40% completion
      expect(getByText(/40% Complete/i)).toBeTruthy();
      // Phase 3 should show unlock message
      expect(getByText(/Unlock at 50% Phase 2/i)).toBeTruthy();
    });
  });

  it('should not unlock Phase 4 if Phase 3 is below 100%', async () => {
    const mockData = {
      skills: [
        // Phase 1 - fully completed
        { id: 'react-hooks', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'context-zustand', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'nextjs', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'node-express', phase: 1, isUnlocked: true, isComplete: true },
        { id: 'mongodb', phase: 1, isUnlocked: true, isComplete: true },
        // Phase 2 - fully completed
        { id: 'linux-bash', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'git', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'docker', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'cicd', phase: 2, isUnlocked: true, isComplete: true },
        { id: 'aws-vercel', phase: 2, isUnlocked: true, isComplete: true },
        // Phase 3 - 4 out of 5 completed (80% < 100%)
        { id: 'jwt', phase: 3, isUnlocked: true, isComplete: true },
        { id: 'bcrypt', phase: 3, isUnlocked: true, isComplete: true },
        { id: 'owasp-top-10', phase: 3, isUnlocked: true, isComplete: true },
        { id: 'nmap', phase: 3, isUnlocked: true, isComplete: true },
        { id: 'wireshark', phase: 3, isUnlocked: true, isComplete: false },
        // Phase 4 - should remain locked
        { id: 'python', phase: 4, isUnlocked: false, isComplete: false },
      ],
    };

    (storageManager.load as jest.Mock).mockResolvedValue(mockData);

    const { getByText } = render(<SkillTree onSkillComplete={jest.fn()} />);
    
    await waitFor(() => {
      // Phase 3 should show 80% completion
      expect(getByText(/80% Complete/i)).toBeTruthy();
      // Phase 4 should show unlock message
      expect(getByText(/Unlock at 100% Phase 3/i)).toBeTruthy();
    });
  });
});
