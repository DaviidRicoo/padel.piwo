import { View } from 'react-native';

import { useTheme, type ColorRole } from '@/theme';

import { AppText } from './AppText';
import type { IconType } from './types';

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'gold' | 'accent';

// Soft tints with strong text, never solid fills: quieter, and each pair is
// checked in tokens.json "pairs" (text on its -soft role).
const TONES: Record<BadgeTone, { bg: ColorRole; fg: ColorRole }> = {
  neutral: { bg: 'surface2', fg: 'textMuted' },
  success: { bg: 'successSoft', fg: 'success' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
  warning: { bg: 'warningSoft', fg: 'warning' },
  gold: { bg: 'goldSoft', fg: 'goldText' },
  accent: { bg: 'accentSoft', fg: 'accentText' },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconType;
}

/** The text always states the status; colour is never the only signal. */
export function Badge({ label, tone = 'neutral', icon: Icon }: BadgeProps) {
  const t = useTheme();
  const s = TONES[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space[1],
        paddingHorizontal: t.space[2],
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: t.color[s.bg],
      }}>
      {Icon ? <Icon color={t.color[s.fg]} size={12} strokeWidth={2.5} /> : null}
      <AppText variant="caption" tone={s.fg} style={{ fontFamily: t.type.label.fontFamily }}>
        {label}
      </AppText>
    </View>
  );
}
