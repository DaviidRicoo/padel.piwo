import { router } from 'expo-router';
import { Pencil, Settings } from 'lucide-react-native';
import { View } from 'react-native';

import { MatchCard } from '@/components/app';
import { AppText, Avatar, Button, Card, ErrorState, LevelChip, LoadingCards, Screen } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import { loadPeople, toMatchCard } from '@/features/matches';
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
      <View style={{ alignItems: 'center', gap: t.space[2] }}>
        <Avatar name={profile.displayName} uri={profile.avatarUrl} size={88} />
        <AppText variant="title" align="center">
          {profile.displayName}
        </AppText>
        <LevelChip value={profile.level} locale={i18n.intlLocale} prefix={tr('common.level')} centered />
        {profile.city ? (
          <AppText variant="bodySm" tone="textMuted">
            {profile.city}
          </AppText>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: t.space[2], justifyContent: 'center' }}>
        <Button label={tr('profile.edit')} icon={Pencil} variant="secondary" size="sm" onPress={() => router.push('/profile-edit')} />
        <Button label={tr('profile.settings')} icon={Settings} variant="secondary" size="sm" onPress={() => router.push('/settings')} />
      </View>

      <SectionTitle>{tr('profile.stats')}</SectionTitle>
      <View style={{ flexDirection: 'row', gap: t.space[2] }}>
        {numbers.map((n) => (
          <Card key={n.label} style={{ flex: 1 }} padding={t.space[3]}>
            <View accessible accessibilityLabel={`${n.label}: ${n.value}`} style={{ alignItems: 'center', gap: 2 }}>
              <AppText variant="title" numeric accessibilityRole="none">
                {n.value}
              </AppText>
              <AppText variant="caption" tone="textMuted">
                {n.label}
              </AppText>
            </View>
          </Card>
        ))}
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
