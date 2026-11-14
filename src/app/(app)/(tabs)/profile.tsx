import { router } from 'expo-router';
import { Pencil, Settings } from 'lucide-react-native';
import { View } from 'react-native';

import { MatchCard, ProfileHeader } from '@/components/app';
import { AppText, Button, ErrorState, LoadingCards, Screen } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import { loadPeople, toMatchCard } from '@/features/matches';
import { profileSubtitle } from '@/features/players';
import { SectionTitle } from '@/features/SectionTitle';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

// S11 My profile: who I am, my level, my numbers and my latest matches.
export default function ProfileScreen() {
  const t = useTheme();
  const api = useApi();
  const me = useUserId();
  const i18n = useI18n();
  const { t: tr } = i18n;

  const q = useQuery(`profile-${me}`, async () => {
    const [profile, ranking, recent] = await Promise.all([api.getProfile(me!), api.ranking(null), api.listMyRecentMatches()]);
    const latest = recent.slice(0, 3);
    return { profile, stats: ranking.find((r) => r.playerId === me), latest, people: await loadPeople(api, latest) };
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
        <ErrorState onRetry={q.refetch} />
      </Screen>
    );

  const { profile, stats, latest, people } = q.data;
  const numbers = [
    { label: tr('profile.played'), value: String(stats?.played ?? 0) },
    { label: tr('profile.won'), value: String(stats?.won ?? 0) },
    { label: tr('profile.winRate'), value: `${i18n.formatNumber(stats?.winRate ?? 0, 0)} %` },
  ];

  return (
    <Screen onRefresh={q.refetch}>
      <ProfileHeader
        name={profile.displayName}
        uri={profile.avatarUrl}
        level={profile.level}
        levelPrefix={tr('common.level')}
        locale={i18n.intlLocale}
        subtitle={profileSubtitle(profile, i18n)}
        stats={numbers}
        statsLabel={tr('profile.stats')}
      />
      <View style={{ flexDirection: 'row', gap: t.space[2] }}>
        <Button label={tr('profile.edit')} icon={Pencil} variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/profile-edit')} />
        <Button label={tr('profile.settings')} icon={Settings} variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/settings')} />
      </View>

      <SectionTitle action={latest.length ? <Button label={tr('profile.seeAll')} variant="ghost" size="sm" onPress={() => router.navigate('/recent')} /> : undefined}>
        {tr('profile.recent')}
      </SectionTitle>
      {latest.length === 0 ? (
        <AppText variant="bodySm" tone="textMuted">
          {tr('profile.noMatches')}
        </AppText>
      ) : (
        latest.map((m) => <MatchCard key={m.id} {...toMatchCard(m, people, me, i18n)} onPress={() => router.push(`/match/${m.id}`)} />)
      )}
    </Screen>
  );
}
