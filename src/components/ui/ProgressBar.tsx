import { View } from 'react-native';

import { useTheme } from '@/theme';

export interface ProgressBarProps {
  value: number;
  max: number;
  /** what the bar measures, e.g. "Parejas confirmadas" */
  accessibilityLabel: string;
}

/** Always shown next to a text count ("3 de 4 parejas"); the bar is never the only signal. */
export function ProgressBar({ value, max, accessibilityLabel }: ProgressBarProps) {
  const t = useTheme();
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      style={{ height: 4, borderRadius: t.radius.pill, backgroundColor: t.color.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: t.radius.pill, backgroundColor: t.color.gold }} />
    </View>
  );
}
