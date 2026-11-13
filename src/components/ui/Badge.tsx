import { View } from 'react-native';

import { useTheme, type ColorRole } from '@/theme';

import { AppText } from './AppText';
import type { IconType } from './types';

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'gold' | 'accent';

const TONES: Record<BadgeTone, { bg: ColorRole | null; fg: ColorRole; border?: ColorRole }> = {
  neutral: { bg: 'surface2', fg: 'text' },
  success: { bg: 'success', fg: 'onSuccess' },
  danger: { bg: 'danger', fg: 'onDanger' },
  // warning has no filled pair that passes in both themes, so it is an outline
  warning: { bg: null, fg: 'warning', border: 'warning' },
  gold: { bg: 'gold', fg: 'onGold' },
  accent: { bg: 'accent', fg: 'onAccent' },
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
        paddingVertical: 2,
        borderRadius: t.radius.pill,
        backgroundColor: s.bg ? t.color[s.bg] : 'transparent',
        borderWidth: s.border ? 1 : 0,
        borderColor: s.border ? t.color[s.border] : undefined,
      }}>
      {Icon ? <Icon color={t.color[s.fg]} size={12} strokeWidth={2.5} /> : null}
      <AppText variant="caption" tone={s.fg}>
        {label}
      </AppText>
    </View>
  );
}
