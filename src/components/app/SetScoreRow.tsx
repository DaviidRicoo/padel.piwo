import { View } from 'react-native';

import { AppText, ChipGroup, type Chip } from '@/components/ui';
import { Stepper } from '@/components/ui/Stepper';
import { SET_MAX_GAMES } from '@/data/rules';
import { useI18n } from '@/i18n';
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

/** The scores most sets end with, from the winner's side. Anything else goes through the counters. */
const COMMON: [number, number][] = [
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [7, 5],
  [7, 6],
];

/** One set: a tap on a common score (top row team A won, bottom row team B), or − and + for the rest. */
export function SetScoreRow({ setLabel, a, b, onChange, teamALabel, teamBLabel, error }: SetScoreRowProps) {
  const t = useTheme();
  const { t: tr } = useI18n();
  const chip = (x: number, y: number, winner: string): Chip<string> => ({
    value: `${x}-${y}`,
    label: `${x}-${y}`,
    accessibilityLabel: `${x}-${y}, ${tr('result.wins', { team: winner })}`,
  });
  const chips = [...COMMON.map(([w, l]) => chip(w, l, teamALabel)), ...COMMON.map(([w, l]) => chip(l, w, teamBLabel))];
  const current = `${a}-${b}`;

  return (
    <View style={{ gap: t.space[2] }}>
      <AppText variant="label" tone="textMuted">
        {setLabel}
      </AppText>
      <ChipGroup
        accessibilityLabel={tr('result.common', { set: setLabel })}
        chips={chips}
        columns={COMMON.length}
        value={chips.some((c) => c.value === current) ? current : null}
        onChange={(v) => {
          const [x, y] = v.split('-').map(Number);
          onChange(x, y);
        }}
      />
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
