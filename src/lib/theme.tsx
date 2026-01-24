'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'alpine-dusk' | 'storm-day' | 'high-alpine';

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
  'alpine-dusk': {
    name: 'Alpine Dusk',
    description: 'Slate blue with warm amber accents - sophisticated twilight mountains',
    primary: { from: '#475569', to: '#334155', text: '#ffffff', subtext: '#cbd5e1' },
    secondary: { from: '#57534e', to: '#44403c', text: '#ffffff', subtext: '#d6d3d1' },
    tertiary: { from: '#78716c', to: '#57534e', text: '#ffffff', subtext: '#d6d3d1' },
    header: { bg: '#1e293b', text: '#f8fafc' },
    accent: '#d97706',
  },
  'storm-day': {
    name: 'Storm Day',
    description: 'Charcoal with ice blue accents - modern, clean, serious',
    primary: { from: '#334155', to: '#1e293b', text: '#ffffff', subtext: '#94a3b8' },    // Slate blue-gray
    secondary: { from: '#0f4c5c', to: '#083344', text: '#ffffff', subtext: '#67e8f9' },  // Deep teal
    tertiary: { from: '#3f3f46', to: '#27272a', text: '#ffffff', subtext: '#a1a1aa' },   // Warm zinc
    header: { bg: '#111827', text: '#f9fafb' },
    accent: '#0ea5e9',
  },
  'high-alpine': {
    name: 'High Alpine',
    description: 'Deep navy with burnt orange accents - classic outdoor brand',
    primary: { from: '#1e3a5a', to: '#172554', text: '#ffffff', subtext: '#93c5fd' },
    secondary: { from: '#365314', to: '#1a2e05', text: '#ffffff', subtext: '#bef264' },
    tertiary: { from: '#78350f', to: '#451a03', text: '#ffffff', subtext: '#fcd34d' },
    header: { bg: '#0f172a', text: '#f8fafc' },
    accent: '#c2410c',
  },
};

interface ThemeContextType {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('alpine-dusk');

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
