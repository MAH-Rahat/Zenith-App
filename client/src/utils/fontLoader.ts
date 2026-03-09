/**
 * Font Loader Utility
 * 
 * Requirements: 4.4, 4.5
 * - Load custom fonts using expo-font before rendering
 * - Fall back to system fonts if custom fonts fail to load
 */

import * as Font from 'expo-font';
import { fontAssets } from '../theme/typography';

let fontsLoaded = false;
let fontLoadError: Error | null = null;

/**
 * Load custom fonts
 * Requirement 4.4: Load custom fonts using expo-font before rendering
 */
export const loadFonts = async (): Promise<boolean> => {
  try {
    // Only load if font assets are defined
    if (Object.keys(fontAssets).length > 0) {
      await Font.loadAsync(fontAssets);
      fontsLoaded = true;
      console.log('Custom fonts loaded successfully');
      return true;
    } else {
      console.warn('No custom fonts defined, using system fonts');
      // Requirement 4.5: Fall back to system fonts if custom fonts fail to load
      fontsLoaded = false;
      return false;
    }
  } catch (error) {
    console.error('Failed to load custom fonts:', error);
    fontLoadError = error as Error;
    // Requirement 4.5: Fall back to system fonts if custom fonts fail to load
    fontsLoaded = false;
    return false;
  }
};

/**
 * Check if fonts are loaded
 */
export const areFontsLoaded = (): boolean => {
  return fontsLoaded;
};

/**
 * Get font load error if any
 */
export const getFontLoadError = (): Error | null => {
  return fontLoadError;
};

/**
 * Reset font load state (useful for testing)
 */
export const resetFontLoadState = (): void => {
  fontsLoaded = false;
  fontLoadError = null;
};
