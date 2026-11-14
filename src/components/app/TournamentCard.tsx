import { Crown, Trophy } from 'lucide-react-native';
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
    <Card onPress={onPress} accessibilityLabel={[name, when, place, sizeLabel, status.label, champion ?? progressLabel].join(', ')} padding={0}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space[3], padding: t.space[4] }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: t.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.color.goldSoft,
          }}>
          <Trophy color={t.color.goldText} size={22} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" accessibilityRole="none">
            {name}
          </AppText>
          <AppText variant="bodySm" tone="textMuted">
            {`${when} · ${place}`}
          </AppText>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <View style={{ gap: t.space[2], paddingHorizontal: t.space[4], paddingVertical: t.space[3], borderTopWidth: 1, borderTopColor: t.color.border }}>
        {champion ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
            <AppText variant="caption" tone="textMuted">
              {sizeLabel}
            </AppText>
            <View style={{ flex: 1 }} />
            <Crown color={t.color.goldText} size={16} strokeWidth={2.25} />
            <AppText variant="label" tone="goldText" numberOfLines={1} style={{ flexShrink: 1 }}>
              {champion}
            </AppText>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText variant="caption" tone="textMuted" style={{ flex: 1 }}>
                {progressLabel}
              </AppText>
              <AppText variant="caption" tone="textMuted">
                {sizeLabel}
              </AppText>
            </View>
            <ProgressBar value={confirmedPairs} max={maxPairs} accessibilityLabel={progressA11yLabel} />
          </>
        )}
      </View>
    </Card>
  );
}
