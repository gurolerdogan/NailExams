export type { Theme, ThemeColors, ThemeFonts, ThemeRadii } from './types';
export { defaultTheme } from './default';
export { teenEnergyTheme } from './teenEnergy';
export { softFocusTheme } from './softFocus';
export { darkTerminalTheme } from './darkTerminal';

import { defaultTheme } from './default';
import { teenEnergyTheme } from './teenEnergy';
import { softFocusTheme } from './softFocus';
import { darkTerminalTheme } from './darkTerminal';
import type { Theme } from './types';

// ─── Registry ─────────────────────────────────────────────────────────────────
// Add a new theme file and push it here — the Theme Selector picks it up automatically.
export const THEME_REGISTRY: Theme[] = [
  defaultTheme,
  teenEnergyTheme,
  softFocusTheme,
  darkTerminalTheme,
];

export function getThemeById(id: string): Theme {
  return THEME_REGISTRY.find((t) => t.id === id) ?? defaultTheme;
}
