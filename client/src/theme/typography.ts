/**
 * Neon Brutalist Design System - Typography
 * 
 * Requirements: 4.1-4.5
 * 
 * Font Usage:
 * - JetBrains Mono OR Geist Mono for all data display (numbers, code, timestamps)
 * - DM Sans for all UI text (labels, buttons, descriptions)
 * - DO NOT use Inter, Roboto, or Arial fonts
 * - Load custom fonts using expo-font before rendering
 * - Fall back to system monospace and sans-serif if custom fonts fail to load
 */

export const typography = {
  // Font Families
  fonts: {
    // Data display font (numbers, code, timestamps)
    // Requirement 4.1: Use JetBrains Mono OR Geist Mono
    mono: 'JetBrainsMono-Regular',
    monoBold: 'JetBrainsMono-Bold',
    
    // UI text font (labels, buttons, descriptions)
    // Requirement 4.2: Use DM Sans
    sans: 'DMSans-Regular',
    sansBold: 'DMSans-Bold',
    sansBlack: 'DMSans-Black',
    
    // Fallback fonts
    // Requirement 4.5: Fall back to system fonts if custom fonts fail
    monoFallback: 'monospace',
    sansFallback: 'sans-serif',
  },

  // Font Sizes
  sizes: {
    xs: 10,
    sm: 11,
    base: 13,
    md: 14,
    lg: 16,
    xl: 18,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 48,
    '6xl': 72, // For Pomodoro timer - Requirement 34.2
  },

  // Font Weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1,
    wider: 1.5,
    widest: 2,
  },
} as const;

/**
 * Font loading configuration for expo-font
 * Requirement 4.4: Load custom fonts using expo-font before rendering
 * 
 * NOTE: Font files need to be downloaded and placed in assets/fonts/:
 * - JetBrainsMono-Regular.ttf
 * - JetBrainsMono-Bold.ttf
 * - DMSans-Regular.ttf
 * - DMSans-Bold.ttf
 * - DMSans-Black.ttf
 * 
 * Download sources:
 * - JetBrains Mono: https://www.jetbrains.com/lp/mono/
 * - DM Sans: https://fonts.google.com/specimen/DM+Sans
 */
export const fontAssets = {
  // JetBrains Mono fonts
  // 'JetBrainsMono-Regular': require('../../assets/fonts/JetBrainsMono-Regular.ttf'),
  // 'JetBrainsMono-Bold': require('../../assets/fonts/JetBrainsMono-Bold.ttf'),
  
  // DM Sans fonts
  // 'DMSans-Regular': require('../../assets/fonts/DMSans-Regular.ttf'),
  // 'DMSans-Bold': require('../../assets/fonts/DMSans-Bold.ttf'),
  // 'DMSans-Black': require('../../assets/fonts/DMSans-Black.ttf'),
};

/**
 * Helper function to get font family with fallback
 * Requirement 4.5: Fall back to system fonts if custom fonts fail to load
 */
export const getFontFamily = (type: 'mono' | 'sans', weight: 'regular' | 'bold' | 'black' = 'regular', fontsLoaded: boolean = true): string => {
  if (!fontsLoaded) {
    return type === 'mono' ? typography.fonts.monoFallback : typography.fonts.sansFallback;
  }

  if (type === 'mono') {
    return weight === 'bold' ? typography.fonts.monoBold : typography.fonts.mono;
  } else {
    if (weight === 'black') return typography.fonts.sansBlack;
    if (weight === 'bold') return typography.fonts.sansBold;
    return typography.fonts.sans;
  }
};

/**
 * Text style presets for common use cases
 */
export const textStyles = {
  // Data display styles (using mono font)
  dataLarge: {
    fontFamily: typography.fonts.mono,
    fontSize: typography.sizes['6xl'],
    fontWeight: typography.weights.bold,
  },
  dataMedium: {
    fontFamily: typography.fonts.mono,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
  },
  dataSmall: {
    fontFamily: typography.fonts.mono,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.regular,
  },
  
  // UI text styles (using sans font)
  heading1: {
    fontFamily: typography.fonts.sansBlack,
    fontSize: typography.sizes['5xl'],
    fontWeight: typography.weights.black,
    letterSpacing: typography.letterSpacing.widest,
  },
  heading2: {
    fontFamily: typography.fonts.sansBold,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.wider,
  },
  heading3: {
    fontFamily: typography.fonts.sansBold,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.wide,
  },
  body: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
  },
  label: {
    fontFamily: typography.fonts.sansBold,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.wider,
  },
  button: {
    fontFamily: typography.fonts.sansBlack,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.black,
    letterSpacing: typography.letterSpacing.widest,
  },
};
