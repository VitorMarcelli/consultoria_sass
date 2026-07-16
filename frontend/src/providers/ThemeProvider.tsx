'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'indigo' | 'blue' | 'emerald' | 'cyan' | 'amber' | 'slate';
type Density = 'compact' | 'comfortable';

interface ThemeContextType {
  theme: Theme;
  accentColor: AccentColor;
  density: Density;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setDensity: (density: Density) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [accentColor, setAccentColor] = useState<AccentColor>('indigo');
  const [density, setDensity] = useState<Density>('comfortable');
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-preference') as Theme;
    const savedColor = localStorage.getItem('theme-color') as AccentColor;
    const savedDensity = localStorage.getItem('theme-density') as Density;

    if (savedTheme) setTheme(savedTheme);
    if (savedColor) setAccentColor(savedColor);
    if (savedDensity) setDensity(savedDensity);
    
    setMounted(true);
  }, []);

  // Update DOM when preferences change
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    // Handle Dark Mode
    const isDark = 
      theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Handle Accent Color (removes all theme- classes and adds the current one)
    const colorClasses = ['theme-indigo', 'theme-blue', 'theme-emerald', 'theme-cyan', 'theme-amber', 'theme-slate'];
    colorClasses.forEach(c => document.body.classList.remove(c));
    document.body.classList.add(`theme-${accentColor}`);

    // Handle Density
    const densityClasses = ['density-compact', 'density-comfortable'];
    densityClasses.forEach(c => document.body.classList.remove(c));
    document.body.classList.add(`density-${density}`);

    // Save to localStorage
    localStorage.setItem('theme-preference', theme);
    localStorage.setItem('theme-color', accentColor);
    localStorage.setItem('theme-density', density);

  }, [theme, accentColor, density, mounted]);

  // Listen for system theme changes if using "system" preference
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, accentColor, density, setTheme, setAccentColor, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
