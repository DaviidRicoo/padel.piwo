import { Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText, Avatar, Badge, Card, LevelChip, type BadgeTone } from '@/components/ui';
import { useTheme } from '@/theme';

import { ScoreLine, type SetScore } from './ScoreLine';

export interface SlotPlayer {
  name: string;
  uri?: string | null;
  me?: boolean;
}

export type MatchStatus = 'open' | 'full' | 'played' | 'cancelled';

export interface MatchCardProps {
  /** already formatted in the user's language and time zone, e.g. "Sáb 16 nov · 18:00" */
  when: string;
  place: string;
  duration?: string;
  typeLabel: string;
  competitive: boolean;
  levelRange?: [number, number];
  /** four slots in order: team A (1, 2), team B (3, 4); null is a free slot */
  slots: (SlotPlayer | null)[];
  status: MatchStatus;
  /** "2 plazas libres", "Completo", "Cancelado"... */
  statusLabel: string;
  /** the score, once a result has been sent (confirmed or not) */
  sets?: SetScore[];
  /** from the viewer's side: win, loss, to confirm, disputed, result missing */
  resultBadge?: { label: string; tone: BadgeTone };
  freeSlotLabel?: string;
  onPress?: () => void;
}

export function MatchCard({
  when,
  place,
  duration,
  typeLabel,
  competitive,
  levelRange,
  slots,
  status,
  statusLabel,
  sets,
  resultBadge,
  freeSlotLabel = 'Plaza libre',
  onPress,
}: MatchCardProps) {
  const t = useTheme();
  const cancelled = status === 'cancelled';
  const summary = [when, place, typeLabel, resultBadge?.label, sets ? null : statusLabel].filter(Boolean).join(', ');
  const showLevel = !sets && !resultBadge && status !== 'played' && levelRange;
  const showStatus = !sets && !resultBadge && status !== 'played';
  const hasFooter = !!(sets || resultBadge || showLevel || showStatus);

  return (
    <Card onPress={onPress} accessibilityLabel={summary} padding={0}>
      <View style={{ padding: t.space[4], gap: t.space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space[3] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" tone={cancelled ? 'textMuted' : 'text'} accessibilityRole="none">
              {when}
            </AppText>
            <AppText variant="bodySm" tone="textMuted">
              {duration ? `${place} · ${duration}` : place}
            </AppText>
          </View>
          <Badge label={typeLabel} tone={competitive ? 'gold' : 'neutral'} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
          <Team slots={slots.slice(0, 2)} freeSlotLabel={freeSlotLabel} />
          <AppText variant="caption" tone="textMuted" style={{ fontFamily: t.type.label.fontFamily, letterSpacing: 1 }}>
            VS
          </AppText>
          <Team slots={slots.slice(2, 4)} freeSlotLabel={freeSlotLabel} />
        </View>
      </View>

      {hasFooter ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: t.space[2],
            minHeight: 48,
            paddingHorizontal: t.space[4],
            paddingVertical: t.space[2],
            borderTopWidth: 1,
            borderTopColor: t.color.border,
          }}>
          {sets ? <ScoreLine sets={sets} /> : null}
          {resultBadge ? <Badge label={resultBadge.label} tone={resultBadge.tone} /> : null}
          {showLevel ? <LevelChip range={levelRange} size="sm" /> : null}
          <View style={{ flex: 1 }} />
          {showStatus ? (
            <AppText variant="label" tone={status === 'open' ? 'accentText' : 'textMuted'}>
              {statusLabel}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const SLOT = 36;

function Team({ slots, freeSlotLabel }: { slots: (SlotPlayer | null)[]; freeSlotLabel: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: t.space[1] + 2 }}>
      {slots.map((p, i) =>
        p ? (
          <Avatar key={i} name={p.name} uri={p.uri} size={SLOT} me={p.me} />
        ) : (
          <View
            key={i}
            accessible
            accessibilityLabel={freeSlotLabel}
            style={{
              width: SLOT,
              height: SLOT,
              borderRadius: SLOT / 2,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: t.color.borderInput,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Plus color={t.color.textMuted} size={14} />
          </View>
        ),
      )}
    </View>
  );
}
