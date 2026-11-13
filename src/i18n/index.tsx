import { getLocales } from 'expo-localization';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Locale } from '@/data/types';
import { APP_TIME_ZONE, type LocalDay } from '@/lib/time';

import { en } from './en';
import { es, type MessageKey } from './es';

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { es, en };
const INTL_LOCALE: Record<Locale, string> = { es: 'es-ES', en: 'en-GB' };

function deviceLocale(): Locale {
  return getLocales()[0]?.languageCode === 'en' ? 'en' : 'es';
}

type Vars = Record<string, string | number>;

/** Keys that have _one and _other forms. */
type PluralBase = { [K in MessageKey]: K extends `${infer B}_one` ? B : never }[MessageKey];

export interface I18n {
  locale: Locale;
  intlLocale: string;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  tn: (base: PluralBase, count: number, vars?: Vars) => string;
  /** "Sáb 16 nov · 18:00", in the residence's time zone */
  formatWhen: (iso: string) => string;
  /** "18:00" */
  formatTime: (iso: string) => string;
  /** "Hoy", "Mañana" or "Sáb 16" for a calendar day */
  formatDayChip: (d: LocalDay, index: number) => { top: string; bottom: string };
  formatNumber: (n: number, maxDecimals?: number) => string;
}

const I18nContext = createContext<I18n | null>(null);

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function build(locale: Locale, setLocale: (l: Locale) => void): I18n {
  const dict = MESSAGES[locale];
  const intlLocale = INTL_LOCALE[locale];
  const plural = new Intl.PluralRules(intlLocale);
  const fill = (text: string, vars?: Vars) => (vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : text);
  const t = (key: MessageKey, vars?: Vars) => fill(dict[key] ?? es[key] ?? key, vars);
  const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: 'short', timeZone: APP_TIME_ZONE });
  const dayMonth = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', timeZone: APP_TIME_ZONE });
  const time = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: APP_TIME_ZONE });
  const clean = (s: string) => capitalize(s.replace(/\.$/, '').replace(/\./g, ''));

  return {
    locale,
    intlLocale,
    setLocale,
    t,
    tn: (base, count, vars) => {
      const form = plural.select(count) === 'one' ? 'one' : 'other';
      return t(`${base}_${form}` as MessageKey, { count, ...vars });
    },
    formatWhen: (iso) => {
      const d = new Date(iso);
      return `${clean(weekday.format(d))} ${clean(dayMonth.format(d)).toLowerCase()} · ${time.format(d)}`;
    },
    formatTime: (iso) => time.format(new Date(iso)),
    formatDayChip: (d, index) => {
      const noon = new Date(Date.UTC(d.year, d.month - 1, d.day, 12));
      const top = index === 0 ? t('common.today') : index === 1 ? t('common.tomorrow') : clean(weekday.format(noon));
      return { top, bottom: clean(dayMonth.format(noon)).toLowerCase() };
    },
    formatNumber: (n, maxDecimals = 1) => new Intl.NumberFormat(intlLocale, { maximumFractionDigits: maxDecimals }).format(n),
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(deviceLocale);
  const value = useMemo(() => build(locale, setLocale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

export type { MessageKey };
