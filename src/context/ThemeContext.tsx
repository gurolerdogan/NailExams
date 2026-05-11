import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeById, THEME_REGISTRY, defaultTheme } from '../themes';
import type { Theme } from '../themes';

// Stored outside STORAGE_KEYS so wipeAll() never clears it —
// theme preference is a device setting, not user data.
const THEME_KEY = 'NE_THEME_V1';

type ThemeCtx = {
  theme: Theme;
  setThemeId: (id: string) => Promise<void>;
  themes: Theme[];
};

const ThemeContext = createContext<ThemeCtx | undefined>(undefined);

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState(defaultTheme.id);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((id) => {
      if (id && getThemeById(id).id === id) setThemeIdState(id);
    });
  }, []);

  const setThemeId = useCallback(async (id: string) => {
    await AsyncStorage.setItem(THEME_KEY, id);
    setThemeIdState(id);
  }, []);

  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  const value = useMemo<ThemeCtx>(
    () => ({ theme, setThemeId, themes: THEME_REGISTRY }),
    [theme, setThemeId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
