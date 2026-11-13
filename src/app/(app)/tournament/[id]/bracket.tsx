import { router, useLocalSearchParams } from 'expo-router';
import { GitBranch } from 'lucide-react-native';

import { Bracket } from '@/components/app';
import { AppText, EmptyState, ErrorState, LoadingCards, Screen } from '@/components/ui';
import { useApi, useQuery } from '@/data/provider';
import type { Match } from '@/data/types';
import { loadTournamentPeople, toBracket } from '@/features/tournaments';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

// S21 Bracket: every round side by side; a tie with a match opens it.
export default function BracketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const theme = useTheme();
  const i18n = useI18n();
  const { t } = i18n;

  const q = useQuery(`bracket-${id}`, async () => {
    const tour = await api.getTournament(id);
    const ids = tour.ties.map((x) => x.matchId).filter((x): x is string => !!x);
    const matches: Record<string, Match> = Object.fromEntries((await Promise.all(ids.map((mid) => api.getMatch(mid)))).map((m) => [m.id, m]));
    return { tour, matches, people: await loadTournamentPeople(api, [tour]) };
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

  const { tour, matches, people } = q.data;
  if (!tour.ties.length) {
    return (
      <Screen>
        <EmptyState icon={GitBranch} title={t('bracket.notDrawnTitle')} body={t('bracket.notDrawnBody')} />
      </Screen>
    );
  }
  const { rounds, champion } = toBracket(tour, matches, people, i18n);
  return (
    <Screen flush onRefresh={q.refetch}>
      <AppText variant="title" style={{ paddingHorizontal: theme.layout.gutter }}>
        {tour.name}
      </AppText>
      <Bracket
        rounds={rounds}
        champion={champion}
        championLabel={t('bracket.champions')}
        tbdLabel={t('bracket.tbd')}
        versusWord={t('bracket.versus')}
        winsWord={t('bracket.wins')}
        onPressTie={(tie) => tie.matchId && router.push(`/match/${tie.matchId}`)}
      />
    </Screen>
  );
}
