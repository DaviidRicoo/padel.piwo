import { router } from 'expo-router';
import { Medal } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { RankingHeader, RankingRow } from '@/components/app';
import { AppText, EmptyState, ErrorState, Group, LoadingCards, Screen, SegmentedControl } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import { useI18n } from '@/i18n';
import { seasonStart } from '@/lib/time';
import { useTheme } from '@/theme';

type Period = 'season' | 'all';
const VISIBLE_BEFORE_PINNING = 10;

// S10 Ranking: confirmed competitive matches, by wins, then win rate, then matches played.
export default function RankingScreen() {
  const t = useTheme();
  const api = useApi();
  const me = useUserId();
  const i18n = useI18n();
  const { t: tr } = i18n;
  const [period, setPeriod] = useState<Period>('season');

  const q = useQuery(`ranking-${period}`, () => api.ranking(period === 'season' ? seasonStart() : null));
  const columns = { played: tr('ranking.colPlayed'), won: tr('ranking.colWon'), winRate: tr('ranking.colRate') };

  // players without a match in the period are left out of the table
  const rows = q.data?.filter((r) => r.played > 0) ?? [];
  const myIndex = rows.findIndex((r) => r.playerId === me);
  const pinMe = myIndex >= VISIBLE_BEFORE_PINNING;

  const footer =
    pinMe && q.data ? (
      <View style={{ marginHorizontal: -t.layout.gutter, gap: t.space[1] }}>
        <AppText variant="caption" tone="textMuted" style={{ paddingHorizontal: t.layout.gutter }}>
          {tr('ranking.you')}
        </AppText>
        <RankingRow {...rowProps(myIndex)} />
      </View>
    ) : undefined;

  function rowProps(i: number) {
    const r = rows[i];
    return {
      position: i + 1,
      name: r.displayName,
      uri: r.avatarUrl,
      level: r.level,
      played: r.played,
      won: r.won,
      winRate: r.winRate,
      me: r.playerId === me,
      columns,
      positionLabel: tr('ranking.position'),
      locale: i18n.intlLocale,
      onPress: () => (r.playerId === me ? router.navigate('/profile') : router.push(`/player/${r.playerId}`)),
    };
  }

  return (
    <Screen onRefresh={q.refetch} footer={footer}>
      <View>
        <SegmentedControl
          accessibilityLabel={tr('ranking.period')}
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'season', label: tr('ranking.season') },
            { value: 'all', label: tr('ranking.all') },
          ]}
        />
      </View>
      {q.loading ? (
        <LoadingCards count={4} />
      ) : q.error ? (
        <ErrorState onRetry={q.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Medal} title={tr('ranking.emptyTitle')} body={tr('ranking.emptyBody')} />
      ) : (
        <View style={{ gap: t.space[1] }}>
          <RankingHeader columns={columns} />
          {/* hairlines start under the avatar: row padding + position column + gap */}
          <Group inset={t.space[3] + 28 + t.space[2]}>
            {rows.map((r, i) => (
              <RankingRow key={r.playerId} {...rowProps(i)} />
            ))}
          </Group>
          <AppText variant="caption" tone="textMuted" style={{ paddingHorizontal: t.space[4], paddingTop: t.space[2] }}>
            {tr('ranking.legend')}
          </AppText>
        </View>
      )}
    </Screen>
  );
}
