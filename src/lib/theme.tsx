'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'storm-day';

export interface ThemeColors {
  name: string;
  description: string;
  // Primary card colors
  primary: { from: string; to: string; text: string; subtext: string };
  secondary: { from: string; to: string; text: string; subtext: string };
  tertiary: { from: string; to: string; text: string; subtext: string };
  // Header
  header: { bg: string; text: string };
  // Accent
  accent: string;
}

export const themes: Record<ThemeName, ThemeColors> = {
  'storm-day': {
    name: 'Storm Day',
    description: 'Charcoal with ice blue accents - modern, clean, serious',
    primary: { from: '#334155', to: '#1e293b', text: '#ffffff', subtext: '#94a3b8' },    // Slate blue-gray
    secondary: { from: '#0f4c5c', to: '#083344', text: '#ffffff', subtext: '#67e8f9' },  // Deep teal
    tertiary: { from: '#3f3f46', to: '#27272a', text: '#ffffff', subtext: '#a1a1aa' },   // Warm zinc
    header: { bg: '#111827', text: '#f9fafb' },
    accent: '#0ea5e9',
  },
};

interface ThemeContextType {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('storm-day');

  useEffect(() => {
    // Load saved theme from localStorage
    const saved = localStorage.getItem('backcountry-theme') as ThemeName;
    if (saved && themes[saved]) {
      setThemeState(saved);
    }
  }, []);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('backcountry-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: themes[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
