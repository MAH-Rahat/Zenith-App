/**
 * Neon Brutalist Design System - Color Tokens
 * 
 * Requirements: 3.1, 3.2
 * 
 * Base Colors:
 * - void: Pure black for screen backgrounds
 * - surface: Dark gray for card backgrounds
 * - surface-raised: Lighter gray for elevated elements
 * - border: Border color for all card edges (1px width)
 * 
 * Neon Accent Colors:
 * - growth: Neon green for positive indicators
 * - alert: Neon red for critical states and warnings
 * - active: Neon cyan for interactive elements
 * - caution: Neon yellow for attention states
 * - void: Gray for disabled or shattered states
 */

export const colors = {
  // Base Colors
  void: '#000000',           // Pure black - screen backgrounds
  surface: '#0D0D0D',        // Dark gray - card backgrounds
  surfaceRaised: '#161616',  // Lighter gray - elevated elements
  border: '#1F1F1F',         // Border color - all card edges at 1px

  // Neon Accent Colors
  growth: '#00FF66',         // Neon green - positive indicators
  alert: '#FF2A42',          // Neon red - critical states and warnings
  active: '#00E5FF',         // Neon cyan - interactive elements
  caution: '#FFB800',        // Neon yellow - attention states
  disabled: '#888888',       // Gray - disabled or shattered states

  // Text Colors (derived from base colors)
  text: '#FFFFFF',           // White text
  textSecondary: '#888888',  // Gray text for secondary content
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Color usage guidelines:
 * 
 * Backgrounds:
 * - Screen backgrounds: colors.void
 * - Card backgrounds: colors.surface
 * - Elevated elements: colors.surfaceRaised
 * 
 * Borders:
 * - All card borders: colors.border at 1px width
 * - Zero box shadows on all elements
 * 
 * Interactive States:
 * - Positive actions/indicators: colors.growth
 * - Critical states/warnings: colors.alert
 * - Interactive elements: colors.active
 * - Attention states: colors.caution
 * - Disabled/shattered states: colors.disabled
 */
