import { View } from 'react-native';

import { AppText, Avatar, Badge, LevelChip } from '@/components/ui';
import { useTheme } from '@/theme';

// counts are at most 3 digits; the win rate needs room for "100 %" on one line
const COUNT_WIDTH = 32;
const RATE_WIDTH = 56;
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
      style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3], paddingHorizontal: t.space[4], paddingVertical: t.space[2] }}>
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
}

export function RankingRow({ position, name, uri, level, played, won, winRate, me, columns, positionLabel = 'Puesto', locale = 'es-ES' }: RankingRowProps) {
  const t = useTheme();
  // a no-break space keeps "100 %" together
  const rate = `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(winRate)} %`;
  return (
    <View
      accessible
      accessibilityLabel={`${positionLabel} ${position}, ${name}, ${played} ${columns.played}, ${won} ${columns.won}, ${rate}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space[3],
        paddingHorizontal: t.space[4],
        paddingVertical: t.space[3],
        backgroundColor: me ? t.color.surface2 : t.color.surface,
      }}>
      <View style={{ width: 32, alignItems: 'center' }}>
        {/* top three get a filled gold badge, never gold text, so contrast holds on any row */}
        {position <= 3 ? (
          <Badge label={String(position)} tone="gold" />
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
    </View>
  );
}

function Stat({ value, width, strong }: { value: string; width: number; strong?: boolean }) {
  return (
    <AppText variant={strong ? 'label' : 'bodySm'} numeric align="right" numberOfLines={1} style={{ width }}>
      {value}
    </AppText>
  );
}
