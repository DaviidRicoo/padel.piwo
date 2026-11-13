import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { Stepper } from '@/components/ui/Stepper';
import { SET_MAX_GAMES } from '@/data/rules';
import { useTheme } from '@/theme';

export interface SetScoreRowProps {
  /** "Set 1" */
  setLabel: string;
  a: number;
  b: number;
  onChange: (a: number, b: number) => void;
  teamALabel: string;
  teamBLabel: string;
  /** e.g. "Un set no puede acabar en empate" */
  error?: string;
}

export function SetScoreRow({ setLabel, a, b, onChange, teamALabel, teamBLabel, error }: SetScoreRowProps) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space[2] }}>
      <AppText variant="label" tone="textMuted">
        {setLabel}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
        <Stepper label={`${setLabel}, ${teamALabel}`} value={a} min={0} max={SET_MAX_GAMES} onChange={(v) => onChange(v, b)} error={!!error} />
        <AppText variant="title" tone="textMuted" accessibilityRole="none">
          –
        </AppText>
        <Stepper label={`${setLabel}, ${teamBLabel}`} value={b} min={0} max={SET_MAX_GAMES} onChange={(v) => onChange(a, v)} error={!!error} />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
