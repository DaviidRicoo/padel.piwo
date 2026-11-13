import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTheme, type TypeVariant } from '@/theme';
import { fontFamily } from '@/theme/fonts';

export interface SetScore {
  a: number;
  b: number;
}

export interface ScoreLineProps {
  sets: SetScore[];
  variant?: TypeVariant;
  /** "a" for screen readers, e.g. "6 a 3" */
  toWord?: string;
}

/** "6-3 · 6-4", the winning side of each set in bold. */
export function ScoreLine({ sets, variant = 'label', toWord = 'a' }: ScoreLineProps) {
  const t = useTheme();
  const spoken = sets.map((s) => `${s.a} ${toWord} ${s.b}`).join(', ');
  const strong = { fontFamily: fontFamily('sans', 700) };
  return (
    <View accessible accessibilityLabel={spoken} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space[2] }}>
      {sets.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
          {/* the container speaks the score; these pieces are never headings, whatever the size */}
          {i > 0 ? (
            <AppText variant={variant} tone="textMuted" accessibilityRole="none">
              ·
            </AppText>
          ) : null}
          <AppText variant={variant} numeric accessibilityRole="none">
            <AppText variant={variant} numeric accessibilityRole="none" style={s.a > s.b ? strong : null}>
              {s.a}
            </AppText>
            -
            <AppText variant={variant} numeric accessibilityRole="none" style={s.b > s.a ? strong : null}>
              {s.b}
            </AppText>
          </AppText>
        </View>
      ))}
    </View>
  );
}
