import { router, useLocalSearchParams } from 'expo-router';

import { MatchCard, ProfileHeader } from '@/components/app';
import { AppText, ErrorState, LoadingCards, Screen } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import { loadPeople, toMatchCard } from '@/features/matches';
import { profileSubtitle } from '@/features/players';
import { SectionTitle } from '@/features/SectionTitle';
import { useI18n } from '@/i18n';

const RECENT = 5;

// S13 Another player's profile: level, numbers and latest matches. Read only.
export default function PlayerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const me = useUserId();
  const i18n = useI18n();
  const { t: tr } = i18n;

  const q = useQuery(`player-${id}`, async () => {
    const [profile, ranking, recent] = await Promise.all([api.getProfile(id), api.ranking(null), api.listPlayerRecentMatches(id)]);
    const latest = recent.slice(0, RECENT);
    return { profile, stats: ranking.find((r) => r.playerId === id), latest, people: await loadPeople(api, latest) };
  });

  if (q.loading)
    return (
      <Screen>
        <LoadingCards count={2} />
      </Screen>
    );
  if (q.error || !q.data)
    return (
      <Screen>
        <ErrorState onRetry={q.refetch} message={q.error?.code === 'not_allowed' ? tr('player.notFound') : undefined} />
      </Screen>
    );

  const { profile, stats, latest, people } = q.data;
  const numbers = [
    { label: tr('profile.played'), value: String(stats?.played ?? 0) },
    { label: tr('profile.won'), value: String(stats?.won ?? 0) },
    { label: tr('profile.winRate'), value: `${i18n.formatNumber(stats?.winRate ?? 0, 0)} %` },
  ];
  const subtitle = profileSubtitle(profile, i18n);

  return (
    <Screen onRefresh={q.refetch}>
      <ProfileHeader
        name={profile.displayName}
        uri={profile.avatarUrl}
        deleted={profile.isDeleted}
        level={profile.level}
        levelPrefix={tr('common.level')}
        locale={i18n.intlLocale}
        subtitle={subtitle}
        stats={numbers}
        statsLabel={tr('profile.stats')}
      />

      <SectionTitle>{tr('player.matches')}</SectionTitle>
      {latest.length === 0 ? (
        <AppText variant="bodySm" tone="textMuted">
          {tr('player.noMatches')}
        </AppText>
      ) : (
        // wins and losses as this player had them
        latest.map((m) => <MatchCard key={m.id} {...toMatchCard(m, people, me, i18n, id)} onPress={() => router.push(`/match/${m.id}`)} />)
      )}
    </Screen>
  );
}
