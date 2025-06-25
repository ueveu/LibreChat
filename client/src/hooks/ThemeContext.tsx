//ThemeContext.js
// source: https://plainenglish.io/blog/light-and-dark-mode-in-react-web-application-with-tailwind-css-89674496b942
import { useSetRecoilState } from 'recoil';
import React, { createContext, useState, useEffect } from 'react';
import { getInitialTheme, applyFontSize } from '~/utils';
import store from '~/store';

type ProviderValue = {
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
};

const defaultContextValue: ProviderValue = {
  theme: getInitialTheme(),
  setTheme: () => {
    return;
  },
};

export const isDark = (): boolean => {
  return false; // Always return false to force light mode
};

export const ThemeContext = createContext<ProviderValue>(defaultContextValue);

export const ThemeProvider = ({ initialTheme, children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const setFontSize = useSetRecoilState(store.fontSize);

  const rawSetTheme = () => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('color-theme', 'light');
  };

  // Remove system theme change listener since we only use light theme

  useEffect(() => {
    const fontSize = localStorage.getItem('fontSize');
    if (fontSize == null) {
      setFontSize('text-base');
      applyFontSize('text-base');
      localStorage.setItem('fontSize', JSON.stringify('text-base'));
      return;
    }
    try {
      applyFontSize(JSON.parse(fontSize));
    } catch (error) {
      console.log(error);
    }
    // Reason: This effect should only run once, and `setFontSize` is a stable function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always set to light theme
  useEffect(() => {
    rawSetTheme();
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
