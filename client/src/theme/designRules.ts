/**
 * Neon Brutalist Design System - Design Rules
 * 
 * Requirements: 76.1-76.5
 * 
 * Zero Shadow Design Rule:
 * - Use zero box shadows on all elements
 * - Convey depth using background color contrast only
 * - Use 1px borders for all card edges
 * - Never use shadowColor, shadowOffset, shadowOpacity, or shadowRadius
 * - Depth hierarchy: void (#000000) → surface (#0D0D0D) → surface-raised (#161616)
 */

export const designRules = {
  // Shadow Rule
  shadows: {
    // NEVER use shadows in this design system
    // Depth is conveyed through background color contrast
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0, // Android shadow
    },
  },

  // Border Rule
  borders: {
    // All card borders must be 1px width
    card: {
      borderWidth: 1,
    },
    // Border radius for cards
    cardRadius: 20,
  },

  // Spacing Rule
  spacing: {
    // 16px padding inside each card
    cardPadding: 16,
    // 12px gaps between cards
    cardGap: 12,
  },

  // Depth Hierarchy (using background colors only)
  depth: {
    // Level 0: Screen background
    screen: '#000000', // colors.void
    // Level 1: Card background
    card: '#0D0D0D', // colors.surface
    // Level 2: Elevated elements
    elevated: '#161616', // colors.surfaceRaised
  },
} as const;

/**
 * Helper function to ensure no shadows are applied
 * Use this to validate component styles
 */
export const noShadowStyle = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
} as const;

/**
 * Helper function to create card styles with proper borders and no shadows
 */
export const createCardStyle = (elevated: boolean = false) => ({
  backgroundColor: elevated ? designRules.depth.elevated : designRules.depth.card,
  borderRadius: designRules.borders.cardRadius,
  borderWidth: designRules.borders.card.borderWidth,
  padding: designRules.spacing.cardPadding,
  ...noShadowStyle,
});
