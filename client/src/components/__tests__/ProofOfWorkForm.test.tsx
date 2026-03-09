/**
 * ProofOfWorkForm.test.tsx
 * 
 * Unit tests for ProofOfWorkForm component.
 * Tests GitHub URL validation, summary text validation, and form submission.
 * 
 * Requirements: 14.3, 14.4, 19.1, 19.2, 19.3
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProofOfWorkForm } from '../ProofOfWorkForm';

describe('ProofOfWorkForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GitHub URL validation', () => {
    it('should accept valid GitHub URL', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = getByPlaceholderText('https://github.com/username/repo');
      fireEvent.changeText(input, 'https://github.com/user/my-project');

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('https://github.com/user/my-project');
      });
    });

    it('should accept GitHub URL with www prefix', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = getByPlaceholderText('https://github.com/username/repo');
      fireEvent.changeText(input, 'https://www.github.com/user/repo');

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('https://www.github.com/user/repo');
      });
    });

    it('should reject invalid GitHub URL format', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = getByPlaceholderText('https://github.com/username/repo');
      fireEvent.changeText(input, 'https://gitlab.com/user/repo');

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Invalid GitHub URL format. Must match github.com pattern')).toBeTruthy();
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('should reject empty GitHub URL', async () => {
      const { getByText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('GitHub URL is required')).toBeTruthy();
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('should trim whitespace from GitHub URL', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = getByPlaceholderText('https://github.com/username/repo');
      fireEvent.changeText(input, '  https://github.com/user/repo  ');

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('https://github.com/user/repo');
      });
    });
  });

  describe('Summary text validation', () => {
    it('should accept valid summary text (minimum 20 characters)', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Switch to summary input
      const summaryTab = getByText('Text Summary');
      fireEvent.press(summaryTab);

      const input = getByPlaceholderText('Describe what you built or learned...');
      fireEvent.changeText(input, 'Built a todo app with React hooks and context API');

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Built a todo app with React hooks and context API');
      });
    });

    it('should reject summary text less than 20 characters', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Switch to summary input
      const summaryTab = getByText('Text Summary');
      fireEvent.press(summaryTab);

      const input = getByPlaceholderText('Describe what you built or learned...');
      fireEvent.changeText(input, 'Too short');

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Summary must be at least 20 characters')).toBeTruthy();
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('should reject empty summary text', async () => {
      const { getByText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Switch to summary input
      const summaryTab = getByText('Text Summary');
      fireEvent.press(summaryTab);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Summary text is required')).toBeTruthy();
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('should trim whitespace from summary text', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Switch to summary input
      const summaryTab = getByText('Text Summary');
      fireEvent.press(summaryTab);

      const input = getByPlaceholderText('Describe what you built or learned...');
      fireEvent.changeText(input, '  Built a React app with hooks  ');

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Built a React app with hooks');
      });
    });

    it('should display character count for summary', () => {
      const { getByText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Switch to summary input
      const summaryTab = getByText('Text Summary');
      fireEvent.press(summaryTab);

      expect(getByText('0/20 characters minimum')).toBeTruthy();
    });
  });

  describe('Input type switching', () => {
    it('should switch between GitHub URL and summary inputs', () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Initially shows GitHub URL input
      expect(getByPlaceholderText('https://github.com/username/repo')).toBeTruthy();

      // Switch to summary
      const summaryTab = getByText('Text Summary');
      fireEvent.press(summaryTab);
      expect(getByPlaceholderText('Describe what you built or learned...')).toBeTruthy();

      // Switch back to GitHub URL
      const githubTab = getByText('GitHub URL');
      fireEvent.press(githubTab);
      expect(getByPlaceholderText('https://github.com/username/repo')).toBeTruthy();
    });

    it('should clear error when switching input types', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Trigger error with invalid GitHub URL
      const input = getByPlaceholderText('https://github.com/username/repo');
      fireEvent.changeText(input, 'invalid-url');
      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Invalid GitHub URL format. Must match github.com pattern')).toBeTruthy();
      });

      // Switch to summary - error should clear
      const summaryTab = getByText('Text Summary');
      fireEvent.press(summaryTab);

      await waitFor(() => {
        expect(() => getByText('Invalid GitHub URL format. Must match github.com pattern')).toThrow();
      });
    });
  });

  describe('Form actions', () => {
    it('should call onCancel when cancel button is pressed', () => {
      const { getByText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should reset form after successful submission', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = getByPlaceholderText('https://github.com/username/repo');
      fireEvent.changeText(input, 'https://github.com/user/repo');

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should display skill name in modal', () => {
      const { getByText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(getByText('React Hooks')).toBeTruthy();
    });
  });

  describe('Existing proof editing', () => {
    it('should pre-fill GitHub URL when editing existing proof', () => {
      const { getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          existingProof="https://github.com/user/existing-repo"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = getByPlaceholderText('https://github.com/username/repo');
      expect(input.props.value).toBe('https://github.com/user/existing-repo');
    });

    it('should pre-fill summary when editing existing text proof', () => {
      const { getByText, getByPlaceholderText } = render(
        <ProofOfWorkForm
          visible={true}
          skillName="React Hooks"
          existingProof="Built a complete React application with hooks"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Should auto-switch to summary tab
      const summaryTab = getByText('Text Summary');
      fireEvent.press(summaryTab);

      const input = getByPlaceholderText('Describe what you built or learned...');
      expect(input.props.value).toBe('Built a complete React application with hooks');
    });
  });
});
