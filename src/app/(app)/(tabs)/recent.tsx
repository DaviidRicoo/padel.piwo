import { router } from 'expo-router';
import { History } from 'lucide-react-native';

import { MatchCard } from '@/components/app';
import { EmptyState, ErrorState, LoadingCards, Screen } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import { loadPeople, toMatchCard } from '@/features/matches';
import { useI18n } from '@/i18n';

// S09 Recent matches: everything I have played, newest first, with its result
// (or what is missing: enter it, confirm it).
export default function RecentScreen() {
  const api = useApi();
  const me = useUserId();
  const i18n = useI18n();
  const { t } = i18n;

  const q = useQuery('recent', async () => {
    const matches = await api.listMyRecentMatches();
    return { matches, people: await loadPeople(api, matches) };
  });

  return (
    <Screen onRefresh={q.refetch}>
      {q.loading ? (
        <LoadingCards />
      ) : q.error || !q.data ? (
        <ErrorState onRetry={q.refetch} />
      ) : q.data.matches.length === 0 ? (
        <EmptyState icon={History} title={t('recent.emptyTitle')} body={t('recent.emptyBody')} actionLabel={t('recent.emptyAction')} onAction={() => router.navigate('/')} />
      ) : (
        q.data.matches.map((m) => <MatchCard key={m.id} {...toMatchCard(m, q.data!.people, me, i18n)} onPress={() => router.push(`/match/${m.id}`)} />)
      )}
    </Screen>
  );
}
