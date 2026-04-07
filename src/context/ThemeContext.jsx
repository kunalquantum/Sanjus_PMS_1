import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext();

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const storedTheme = window.localStorage.getItem('theme_mode');
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme_mode', theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
