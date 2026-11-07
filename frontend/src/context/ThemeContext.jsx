import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext(null);

export const THEMES = [
  {
    id: 'clinical-clean',
    name: 'Clinical Clean',
    tagline: 'Hospital Pearl & Slate',
    isDark: false,
    preview: {
      canvas: '#f8fafc',
      accent: '#e11d48',
      telemetry: '#0284c7',
    },
  },
];

const STORAGE_KEY = 'blood_donor_theme';

export function ThemeProvider({ children }) {
  const currentTheme = 'clinical-clean';
  const activeThemeMeta = THEMES[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'clinical-clean');
    } catch {
      // Ignore localStorage write errors
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', 'clinical-clean');
    root.style.colorScheme = 'light';

    // Clean up any stale dark theme classes
    root.classList.remove('theme-crimson-pulse', 'theme-biomed-emerald', 'theme-neuro-cobalt', 'dark');
    root.classList.add('theme-clinical-clean');
  }, []);

  // Safe no-op to avoid breaking any callers
  const setTheme = () => {};

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        setTheme,
        themes: THEMES,
        activeThemeMeta,
        isDark: false,
      }}
    >
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

export default ThemeContext;
