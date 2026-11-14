import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { formatLevel } from './types';

export interface LevelChipProps {
  /** a player's level */
  value?: number;
  /** or a match's allowed range */
  range?: [number, number];
  size?: 'sm' | 'md';
  locale?: string;
  /** "Nivel" in Spanish; passed in by i18n later */
  prefix?: string;
  /** centre the chip in a centred column (it sits at the start by default) */
  centered?: boolean;
}

export function LevelChip({ value, range, size = 'md', locale = 'es-ES', prefix = 'Nivel', centered }: LevelChipProps) {
  const t = useTheme();
  const fmt = (n: number) => formatLevel(n, locale);
  // a range reads better short: 3–5, 3,5–5
  const short = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  const text = range ? `${short(range[0])}–${short(range[1])}` : value != null ? fmt(value) : '–';
  const spoken = range ? `${prefix} ${short(range[0])} – ${short(range[1])}` : `${prefix} ${text}`;
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{
        alignSelf: centered ? 'center' : 'flex-start',
        paddingHorizontal: size === 'sm' ? t.space[2] : t.space[3],
        paddingVertical: size === 'sm' ? 3 : t.space[1],
        borderRadius: size === 'sm' ? 6 : t.radius.pill,
        backgroundColor: t.color.sageSoft,
      }}>
      <AppText variant={size === 'sm' ? 'caption' : 'label'} tone="sageText" numeric style={size === 'sm' ? { fontFamily: t.type.label.fontFamily } : null}>
        {text}
      </AppText>
    </View>
  );
}
