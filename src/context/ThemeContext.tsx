import React, { createContext, useContext, useEffect } from 'react';

type ThemeMode = 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: true;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Permanently enforce dark mode across the entire application
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    localStorage.setItem('ktct_theme', 'dark');
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: 'dark',
        isDark: true,
        toggleTheme: () => {},
        setTheme: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

