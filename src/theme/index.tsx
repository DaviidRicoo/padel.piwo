import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';

import { fontFamily } from './fonts';
import { tokens, type ColorRole, type ThemeName, type TypeVariant } from './tokens';

export type ThemeMode = 'system' | ThemeName;
export type Colors = Record<ColorRole, string>;
export type { ColorRole, ThemeName, TypeVariant } from './tokens';

export interface Theme {
  name: ThemeName;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  color: Colors;
  type: Record<TypeVariant, TextStyle>;
  space: typeof tokens.space;
  radius: typeof tokens.radius;
  layout: typeof tokens.layout;
  opacity: typeof tokens.opacity;
  motion: typeof tokens.motion;
  /** press feedback: pressable surfaces shrink a little, Apple-style */
  scale: typeof tokens.scale;
  shadow: (level: keyof typeof tokens.shadow) => { boxShadow: string };
  /** a colour role at an alpha, for scrims and shadows */
  alpha: (role: ColorRole, alpha: number) => string;
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const typeStyles = Object.fromEntries(
  Object.entries(tokens.type).map(([name, t]) => [
    name,
    { fontFamily: fontFamily(t.family, t.weight), fontSize: t.size, lineHeight: t.line, letterSpacing: t.tracking },
  ]),
) as Record<TypeVariant, TextStyle>;

function buildTheme(name: ThemeName, mode: ThemeMode, setMode: (m: ThemeMode) => void): Theme {
  const color: Colors = tokens.color[name];
  const alpha = (role: ColorRole, a: number) => hexToRgba(color[role], a);
  // shadows are stronger in dark mode, where a dark shadow on a dark surface barely shows
  const shadowBoost = name === 'dark' ? 2.5 : 1;
  return {
    name,
    mode,
    setMode,
    color,
    type: typeStyles,
    space: tokens.space,
    radius: tokens.radius,
    layout: tokens.layout,
    opacity: tokens.opacity,
    motion: tokens.motion,
    scale: tokens.scale,
    alpha,
    shadow: (level) => {
      const s = tokens.shadow[level];
      return {
        boxShadow: `0px ${s.offsetY}px ${s.blur}px ${alpha('scrim', Math.min(1, s.opacity * shadowBoost))}`,
      };
    },
  };
}

const ThemeContext = createContext<Theme | null>(null);

/**
 * Follows the phone's light or dark setting by default. `setMode` forces one
 * theme (the /design page uses it; settings S14 can later).
 */
export function AppThemeProvider({ children, initialMode = 'system' }: { children: ReactNode; initialMode?: ThemeMode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const name: ThemeName = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const theme = useMemo(() => buildTheme(name, mode, setMode), [name, mode]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <AppThemeProvider>');
  return theme;
}
