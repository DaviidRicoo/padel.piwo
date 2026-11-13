import { Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText, Badge, Card, ProgressBar, type BadgeTone } from '@/components/ui';
import { useTheme } from '@/theme';

export interface TournamentCardProps {
  name: string;
  /** formatted date, e.g. "Sáb 23 nov" */
  when: string;
  place: string;
  /** "8 jugadores" */
  sizeLabel: string;
  confirmedPairs: number;
  maxPairs: number;
  /** "3 de 4 parejas" */
  progressLabel: string;
  progressA11yLabel?: string;
  status: { label: string; tone: BadgeTone };
  /** names of the winning pair, once finished */
  champion?: string;
  onPress?: () => void;
}

export function TournamentCard({
  name,
  when,
  place,
  sizeLabel,
  confirmedPairs,
  maxPairs,
  progressLabel,
  progressA11yLabel = 'Parejas confirmadas',
  status,
  champion,
  onPress,
}: TournamentCardProps) {
  const t = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={[name, when, place, sizeLabel, status.label, champion ?? progressLabel].join(', ')}>
      <View style={{ gap: t.space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space[3] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" accessibilityRole="none">
              {name}
            </AppText>
            <AppText variant="bodySm" tone="textMuted">
              {`${when} · ${place} · ${sizeLabel}`}
            </AppText>
          </View>
          <Badge label={status.label} tone={status.tone} />
        </View>
        {champion ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
            <Trophy color={t.color.goldText} size={18} />
            <AppText variant="label" tone="goldText">
              {champion}
            </AppText>
          </View>
        ) : (
          <View style={{ gap: t.space[1] }}>
            <ProgressBar value={confirmedPairs} max={maxPairs} accessibilityLabel={progressA11yLabel} />
            <AppText variant="caption" tone="textMuted">
              {progressLabel}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}
