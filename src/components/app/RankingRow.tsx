import { Pressable, View, type ViewStyle } from 'react-native';

import { AppText, Avatar, LevelChip } from '@/components/ui';
import { useFocusRing } from '@/components/ui/focus';
import { useTheme } from '@/theme';

// counts are at most 3 digits; the win rate needs room for "100 %" on one line
const COUNT_WIDTH = 28;
const RATE_WIDTH = 52;
const WIDTHS = [COUNT_WIDTH, COUNT_WIDTH, RATE_WIDTH];

export interface RankingColumns {
  played: string;
  won: string;
  winRate: string;
}

/** Column titles above the list. */
export function RankingHeader({ columns }: { columns: RankingColumns }) {
  const t = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // same gap and widths as the rows, so the titles sit above their numbers
      style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2], paddingHorizontal: t.space[3], paddingVertical: t.space[2] }}>
      <View style={{ flex: 1 }} />
      {[columns.played, columns.won, columns.winRate].map((c, i) => (
        <AppText key={c} variant="caption" tone="textMuted" align="right" style={{ width: WIDTHS[i] }}>
          {c}
        </AppText>
      ))}
    </View>
  );
}

export interface RankingRowProps {
  position: number;
  name: string;
  uri?: string | null;
  level: number;
  played: number;
  won: number;
  /** 0 to 100 */
  winRate: number;
  me?: boolean;
  columns: RankingColumns;
  positionLabel?: string;
  locale?: string;
  /** opens the player's profile */
  onPress?: () => void;
}

export function RankingRow({ position, name, uri, level, played, won, winRate, me, columns, positionLabel = 'Puesto', locale = 'es-ES', onPress }: RankingRowProps) {
  const t = useTheme();
  const focus = useFocusRing();
  // a no-break space keeps "100 %" together
  const rate = `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(winRate)}\u00A0%`;
  const label = `${positionLabel} ${position}, ${name}, ${played} ${columns.played}, ${won} ${columns.won}, ${rate}`;
  const row: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
    paddingHorizontal: t.space[3],
    paddingVertical: t.space[3],
    backgroundColor: me ? t.color.surface2 : t.color.surface,
  };
  const content = (
    <>
      <View style={{ width: 28, alignItems: 'center' }}>
        {/* top three: the number on a soft gold disc (gold text on gold-soft is a checked pair) */}
        {position <= 3 ? (
          <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.goldSoft }}>
            <AppText variant="label" tone="goldText" numeric>
              {position}
            </AppText>
          </View>
        ) : (
          <AppText variant="label" tone="textMuted" numeric>
            {position}
          </AppText>
        )}
      </View>
      <Avatar name={name} uri={uri} size={32} me={me} />
      <View style={{ flex: 1, gap: 2 }}>
        {/* two lines: full names fit at phone width instead of being cut */}
        <AppText variant="label" numberOfLines={2}>
          {name}
        </AppText>
        <LevelChip value={level} size="sm" locale={locale} />
      </View>
      <Stat value={String(played)} width={COUNT_WIDTH} />
      <Stat value={String(won)} width={COUNT_WIDTH} />
      <Stat value={rate} width={RATE_WIDTH} strong />
    </>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={row}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      {...focus.handlers}
      style={({ pressed }) => [row, pressed ? { backgroundColor: t.color.surface2 } : null, focus.ring]}>
      {content}
    </Pressable>
  );
}

function Stat({ value, width, strong }: { value: string; width: number; strong?: boolean }) {
  return (
    <AppText variant={strong ? 'label' : 'bodySm'} numeric align="right" numberOfLines={1} style={{ width }}>
      {value}
    </AppText>
  );
}
