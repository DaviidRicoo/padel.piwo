import type { ComponentType } from 'react';

/** Any Lucide icon (or a component with the same props). */
export type IconType = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

/** Format a level the way the community reads it: 4,11 in Spanish, 4.11 in English. */
export function formatLevel(value: number, locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/**
 * First letter of the first and last words that have a letter. Words that are only
 * emoji or symbols are skipped, and a letter is read as a whole code point, so an
 * emoji is never cut in half (BUG-001: "Zoë Núñez 🎾" gave "Z" plus half an emoji).
 */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((word) => word.match(/\p{L}/u)?.[0])
    .filter((x): x is string => !!x);
  if (letters.length === 0) return '?';
  const last = letters.length > 1 ? letters[letters.length - 1] : '';
  return (letters[0] + last).toLocaleUpperCase();
}
