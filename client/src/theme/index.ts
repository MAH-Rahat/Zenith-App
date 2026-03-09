export interface Theme {
  name: string;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    activeDay: string;
    inactiveDay: string;
  };
}

export const nothingPhoneTheme: Theme = {
  name: 'nothing',
  colors: {
    background: '#000000',
    surface: '#1a1a1a',
    primary: '#FF0000', // Neon red
    secondary: '#333333',
    accent: '#FF0000', // Neon red
    text: '#ffffff',
    textSecondary: '#cccccc',
    border: '#555555',
    success: '#00aa00',
    warning: '#ffaa00',
    error: '#ff0000',
    activeDay: '#FF0000', // Neon red for active days
    inactiveDay: '#000000',
  },
};

export const defaultTheme: Theme = {
  name: 'default',
  colors: {
    background: '#000000',
    surface: '#1a1a1a',
    primary: '#00ff00', // Bright green
    secondary: '#333333',
    accent: '#00ff00', // Bright green
    text: '#ffffff',
    textSecondary: '#cccccc',
    border: '#555555',
    success: '#00aa00',
    warning: '#ffaa00',
    error: '#ff0000',
    activeDay: '#00FF00', // Bright green for active days
    inactiveDay: '#000000',
  },
};

export const getTheme = (isNothingPhone: boolean): Theme => {
  return isNothingPhone ? nothingPhoneTheme : defaultTheme;
};
