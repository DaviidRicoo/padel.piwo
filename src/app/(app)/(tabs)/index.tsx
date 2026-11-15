import { router } from 'expo-router';
import { CalendarPlus, CalendarX } from 'lucide-react-native';

import { MatchCard } from '@/components/app';
import { Button, EmptyState, ErrorState, LoadingCards, Screen } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import { loadPeople, toMatchCard } from '@/features/matches';
import { PhotoBanner, PLAYER_PHOTOS } from '@/features/PhotoBanner';
import { SectionTitle } from '@/features/SectionTitle';
import { useI18n } from '@/i18n';

// S05 Matches: my upcoming matches, then every open match in the residence.
export default function MatchesScreen() {
  const api = useApi();
  const me = useUserId();
  const i18n = useI18n();
  const { t } = i18n;

  const q = useQuery('home', async () => {
    const [mine, open] = await Promise.all([api.listMyUpcomingMatches(), api.listOpenMatches()]);
    const others = open.filter((m) => !mine.some((x) => x.id === m.id));
    return { mine, open: others, people: await loadPeople(api, [...mine, ...others]) };
  });

  const footer = <Button label={t('matches.create')} icon={CalendarPlus} size="lg" fullWidth onPress={() => router.push('/match/new')} />;

  return (
    <Screen onRefresh={q.refetch} footer={footer}>
      <PhotoBanner title={t('matches.bannerTitle')} body={t('matches.bannerBody')} photo={PLAYER_PHOTOS.ball} onPress={() => router.push('/match/new')} />
      {q.loading ? (
        <LoadingCards />
      ) : q.error || !q.data ? (
        <ErrorState onRetry={q.refetch} />
      ) : (
        <>
          {q.data.mine.length > 0 ? (
            <>
              <SectionTitle>{t('matches.mine')}</SectionTitle>
              {q.data.mine.map((m) => (
                <MatchCard key={m.id} {...toMatchCard(m, q.data!.people, me, i18n)} onPress={() => router.push(`/match/${m.id}`)} />
              ))}
            </>
          ) : null}
          <SectionTitle>{t('matches.open')}</SectionTitle>
          {q.data.open.length === 0 ? (
            <EmptyState icon={CalendarX} title={t('matches.emptyOpenTitle')} body={t('matches.emptyOpenBody')} />
          ) : (
            q.data.open.map((m) => <MatchCard key={m.id} {...toMatchCard(m, q.data!.people, me, i18n)} onPress={() => router.push(`/match/${m.id}`)} />)
          )}
        </>
      )}
    </Screen>
  );
}
