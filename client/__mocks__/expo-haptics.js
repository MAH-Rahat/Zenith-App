/**
 * Mock for expo-haptics
 * Used in Jest tests to avoid native module dependencies
 */

const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
};

const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};

const impactAsync = jest.fn(() => Promise.resolve());
const notificationAsync = jest.fn(() => Promise.resolve());
const selectionAsync = jest.fn(() => Promise.resolve());

module.exports = {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  selectionAsync,
};
