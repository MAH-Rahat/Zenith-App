/**
 * Bento Grid Layout Component
 * 
 * Requirements: 5.1-5.7
 * 
 * Features:
 * - 12-column grid layout
 * - 20px border radius on cards
 * - 1px borders using border color token
 * - Zero box shadows on all cards
 * - 16px padding inside each card
 * - 12px gaps between cards
 * - Responsive card spanning (6-column, 12-column widths)
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { designRules, noShadowStyle } from '../theme/designRules';

interface BentoGridProps {
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}

interface BentoCardProps {
  children: React.ReactNode;
  span?: 6 | 12; // Column span (6 = half width, 12 = full width)
  elevated?: boolean; // Use elevated background color
  style?: ViewStyle;
}

/**
 * Bento Grid Container
 * Requirement 5.1: Use 12-column Bento Grid layout
 * Requirement 5.6: Use 12px gaps between cards
 */
export const BentoGrid: React.FC<BentoGridProps> = ({ 
  children, 
  gap = designRules.spacing.cardGap,
  style 
}) => {
  return (
    <View style={[styles.grid, { gap }, style]}>
      {children}
    </View>
  );
};

/**
 * Bento Card Component
 * Requirement 5.2: Render cards with borderRadius of 20px
 * Requirement 5.3: Apply 1px borders using border color token
 * Requirement 5.4: Use zero box shadows on all cards
 * Requirement 5.5: Apply 16px padding inside each card
 * Requirement 5.7: Support responsive card spanning
 */
export const BentoCard: React.FC<BentoCardProps> = ({ 
  children, 
  span = 12,
  elevated = false,
  style 
}) => {
  const cardStyle = span === 6 ? styles.cardHalf : styles.cardFull;
  const bgColor = elevated ? colors.surfaceRaised : colors.surface;

  return (
    <View 
      style={[
        styles.card,
        cardStyle,
        { backgroundColor: bgColor },
        style
      ]}
    >
      {children}
    </View>
  );
};

/**
 * Bento Row Component
 * Helper for creating rows of cards
 */
export const BentoRow: React.FC<{ children: React.ReactNode; gap?: number; style?: ViewStyle }> = ({ 
  children, 
  gap = designRules.spacing.cardGap,
  style 
}) => {
  return (
    <View style={[styles.row, { gap }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    // Gap is applied via prop
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    // Gap is applied via prop
  },
  card: {
    // Requirement 5.2: Render cards with borderRadius of 20px
    borderRadius: designRules.borders.cardRadius,
    // Requirement 5.3: Apply 1px borders using border color token
    borderWidth: designRules.borders.card.borderWidth,
    borderColor: colors.border,
    // Requirement 5.5: Apply 16px padding inside each card
    padding: designRules.spacing.cardPadding,
    // Requirement 5.4: Use zero box shadows on all cards
    ...noShadowStyle,
  },
  cardFull: {
    // Requirement 5.7: Support responsive card spanning (12-column = full width)
    width: '100%',
  },
  cardHalf: {
    // Requirement 5.7: Support responsive card spanning (6-column = half width)
    flex: 1,
  },
});

// Export default for convenience
export default BentoGrid;
