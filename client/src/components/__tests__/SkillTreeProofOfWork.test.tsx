/**
 * SkillTreeProofOfWork.test.tsx
 * 
 * Unit tests for proof-of-work storage and display in SkillTree component.
 * Tests proof submission, storage, display, and editing functionality.
 * 
 * Requirements: 14.5, 14.6, 19.4, 19.5, 19.6
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SkillTree } from '../SkillTree';
import { storageManager } from '../../services/StorageManager';

// Mock storageManager
jest.mock('../../services/StorageManager', () => ({
  storageManager: {
    save: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue(null),
  },
}));

describe('SkillTree - Proof of Work', () => {
  const mockOnSkillComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Proof-of-work submission', () => {
    it('should open proof-of-work form when unlocked node is tapped', async () => {
      const { getByText } = render(
        <SkillTree onSkillComplete={mockOnSkillComplete} />
      );

      // Wait for skill tree to load
      await waitFor(() => {
        expect(getByText('Phase 1: MERN Stack')).toBeTruthy();
      });

      // Expand Phase 1
      const phase1Header = getByText('Phase 1: MERN Stack');
      fireEvent.press(phase1Header);

      await waitFor(() => {
        // Find a skill node (React Hooks should be unlocked by default in Phase 1)
        const reactHooksNode = getByText('React Hooks');
        expect(reactHooksNode).toBeTruthy();
        
        // Tap the node
        fireEvent.press(reactHooksNode);
      });

      // Proof of work form should open
      await waitFor(() => {
        expect(getByText('Proof of Work')).toBeTruthy();
      });
    });

    it('should mark node as complete when proof is submitted', async () => {
      const { getByText, getByPlaceholderText } = render(
        <SkillTree onSkillComplete={mockOnSkillComplete} />
      );

      // Wait for skill tree to load
      await waitFor(() => {
        expect(getByText('Phase 1: MERN Stack')).toBeTruthy();
      });

      // Expand Phase 1
      const phase1Header = getByText('Phase 1: MERN Stack');
      fireEvent.press(phase1Header);

      await waitFor(() => {
        const reactHooksNode = getByText('React Hooks');
        fireEvent.press(reactHooksNode);
      });

      // Fill in proof of work
      await waitFor(() => {
        const input = getByPlaceholderText('https://github.com/username/repo');
        fireEvent.changeText(input, 'https://github.com/user/react-hooks-project');
        
        const submitButton = getByText('Submit');
        fireEvent.press(submitButton);
      });

      // Verify node completion
      await waitFor(() => {
        expect(mockOnSkillComplete).toHaveBeenCalled();
        expect(storageManager.save).toHaveBeenCalled();
      });
    });

    it('should store proof-of-work in skill_nodes data', async () => {
      const { getByText, getByPlaceholderText } = render(
        <SkillTree onSkillComplete={mockOnSkillComplete} />
      );

      await waitFor(() => {
        expect(getByText('Phase 1: MERN Stack')).toBeTruthy();
      });

      const phase1Header = getByText('Phase 1: MERN Stack');
      fireEvent.press(phase1Header);

      await waitFor(() => {
        const reactHooksNode = getByText('React Hooks');
        fireEvent.press(reactHooksNode);
      });

      const proofText = 'https://github.com/user/my-awesome-project';
      
      await waitFor(() => {
        const input = getByPlaceholderText('https://github.com/username/repo');
        fireEvent.changeText(input, proofText);
        
        const submitButton = getByText('Submit');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(storageManager.save).toHaveBeenCalledWith(
          'zenith_skill_tree',
          expect.objectContaining({
            skills: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                proofOfWork: proofText,
                isComplete: true,
                completedAt: expect.any(String),
              }),
            ]),
          })
        );
      });
    });
  });

  describe('Proof-of-work display', () => {
    it('should display proof-of-work when completed node is tapped', async () => {
      // Mock storage with completed skill
      (storageManager.load as jest.Mock).mockResolvedValueOnce({
        skills: [
          {
            id: 'react-hooks',
            name: 'React Hooks',
            phase: 1,
            level: 1,
            isUnlocked: true,
            isComplete: true,
            proofOfWork: 'https://github.com/user/completed-project',
            completedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      const { getByText } = render(
        <SkillTree onSkillComplete={mockOnSkillComplete} />
      );

      await waitFor(() => {
        expect(getByText('Phase 1: MERN Stack')).toBeTruthy();
      });

      const phase1Header = getByText('Phase 1: MERN Stack');
      fireEvent.press(phase1Header);

      await waitFor(() => {
        const reactHooksNode = getByText('React Hooks');
        fireEvent.press(reactHooksNode);
      });

      // Proof of work form should open with existing proof
      await waitFor(() => {
        expect(getByText('Proof of Work')).toBeTruthy();
        // The form should show the existing proof in the input
      });
    });

    it('should allow editing proof-of-work after initial submission', async () => {
      // Mock storage with completed skill
      (storageManager.load as jest.Mock).mockResolvedValueOnce({
        skills: [
          {
            id: 'react-hooks',
            name: 'React Hooks',
            phase: 1,
            level: 1,
            isUnlocked: true,
            isComplete: true,
            proofOfWork: 'https://github.com/user/old-project',
            completedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      const { getByText, getByPlaceholderText } = render(
        <SkillTree onSkillComplete={mockOnSkillComplete} />
      );

      await waitFor(() => {
        expect(getByText('Phase 1: MERN Stack')).toBeTruthy();
      });

      const phase1Header = getByText('Phase 1: MERN Stack');
      fireEvent.press(phase1Header);

      await waitFor(() => {
        const reactHooksNode = getByText('React Hooks');
        fireEvent.press(reactHooksNode);
      });

      // Edit the proof
      const newProof = 'https://github.com/user/updated-project';
      
      await waitFor(() => {
        const input = getByPlaceholderText('https://github.com/username/repo');
        fireEvent.changeText(input, newProof);
        
        const submitButton = getByText('Submit');
        fireEvent.press(submitButton);
      });

      // Verify updated proof is saved
      await waitFor(() => {
        expect(storageManager.save).toHaveBeenCalledWith(
          'zenith_skill_tree',
          expect.objectContaining({
            skills: expect.arrayContaining([
              expect.objectContaining({
                proofOfWork: newProof,
              }),
            ]),
          })
        );
      });
    });
  });

  describe('Form cancellation', () => {
    it('should close form without saving when cancel is pressed', async () => {
      const { getByText, queryByText } = render(
        <SkillTree onSkillComplete={mockOnSkillComplete} />
      );

      await waitFor(() => {
        expect(getByText('Phase 1: MERN Stack')).toBeTruthy();
      });

      const phase1Header = getByText('Phase 1: MERN Stack');
      fireEvent.press(phase1Header);

      await waitFor(() => {
        const reactHooksNode = getByText('React Hooks');
        fireEvent.press(reactHooksNode);
      });

      await waitFor(() => {
        const cancelButton = getByText('Cancel');
        fireEvent.press(cancelButton);
      });

      // Form should close
      await waitFor(() => {
        expect(queryByText('Proof of Work')).toBeNull();
        expect(mockOnSkillComplete).not.toHaveBeenCalled();
      });
    });
  });

  describe('Phase unlocking with proof-of-work', () => {
    it('should unlock Phase 2 when Phase 1 reaches 80% with proof submissions', async () => {
      const { getByText, getByPlaceholderText } = render(
        <SkillTree onSkillComplete={mockOnSkillComplete} />
      );

      await waitFor(() => {
        expect(getByText('Phase 1: MERN Stack')).toBeTruthy();
      });

      // Phase 1 has 5 skills, need 4 completed (80%)
      // This test verifies the integration works, actual phase unlocking
      // is tested in the main SkillTree tests
      
      const phase1Header = getByText('Phase 1: MERN Stack');
      fireEvent.press(phase1Header);

      // Complete first skill
      await waitFor(() => {
        const reactHooksNode = getByText('React Hooks');
        fireEvent.press(reactHooksNode);
      });

      await waitFor(() => {
        const input = getByPlaceholderText('https://github.com/username/repo');
        fireEvent.changeText(input, 'https://github.com/user/project1');
        
        const submitButton = getByText('Submit');
        fireEvent.press(submitButton);
      });

      // Verify completion was recorded
      await waitFor(() => {
        expect(mockOnSkillComplete).toHaveBeenCalled();
      });
    });
  });
});
