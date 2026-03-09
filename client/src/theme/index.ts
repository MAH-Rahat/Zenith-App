import { colors } from './colors';

export interface Theme {
  name: string;
  colors: typeof colors;
}

export const neonBrutalistTheme: Theme = {
  name: 'neon-brutalist',
  colors: colors,
};

export const getTheme = (): Theme => {
  return neonBrutalistTheme;
};

// Re-export colors for direct access
export { colors } from './colors';
export type { ColorToken } from './colors';
