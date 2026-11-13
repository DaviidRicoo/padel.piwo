import { router } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { TournamentCard } from '@/components/app';
import { AppText, Button, Card, EmptyState, ErrorState, LoadingCards, Screen } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import { confirmedPairs } from '@/data/rules';
import type { Tournament } from '@/data/types';
import { useAction } from '@/data/useAction';
import { nameOf, type People } from '@/features/matches';
import { SectionTitle } from '@/features/SectionTitle';
import { loadTournamentPeople, pairName, tournamentStatus } from '@/features/tournaments';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

// S17 Tournaments: invitations waiting for me, then open, running and finished tournaments.
export default function TournamentsScreen() {
  const api = useApi();
  const me = useUserId();
  const i18n = useI18n();
  const { t } = i18n;
  const { busy, run } = useAction();

  const q = useQuery('tournaments', async () => {
    const list = await api.listTournaments();
    return { list, people: await loadTournamentPeople(api, list) };
  });

  const footer = <Button label={t('tournaments.create')} icon={Trophy} size="lg" fullWidth onPress={() => router.push('/tournament/new')} />;

  if (q.loading)
    return (
      <Screen footer={footer}>
        <LoadingCards />
      </Screen>
    );
  if (q.error || !q.data)
    return (
      <Screen footer={footer}>
        <ErrorState onRetry={q.refetch} />
      </Screen>
    );

  const { list, people } = q.data;
  const invites = list.flatMap((tour) =>
    tour.status === 'registration' ? tour.pairs.filter((p) => p.status === 'pending' && p.player2Id === me).map((pair) => ({ tour, pair })) : [],
  );
  const open = list.filter((x) => x.status === 'registration');
  const running = list.filter((x) => x.status === 'in_progress');
  // finished and cancelled, most recent first
  const past = list.filter((x) => x.status === 'finished' || x.status === 'cancelled').reverse();

  return (
    <Screen onRefresh={q.refetch} footer={footer}>
      {invites.map(({ tour, pair }) => (
        <Invite
          key={pair.id}
          text={t('tournaments.invite', { name: nameOf(people, pair.player1Id), tournament: tour.name })}
          busy={busy}
          onAccept={() => run('accept', () => api.respondPairInvite(pair.id, true), t('tournaments.accepted'))}
          onDecline={() => run('decline', () => api.respondPairInvite(pair.id, false), t('tournaments.declined'))}
        />
      ))}
      {list.length === 0 ? <EmptyState icon={Trophy} title={t('tournaments.emptyTitle')} body={t('tournaments.emptyBody')} /> : null}
      <Section title={t('tournaments.open')} items={open} people={people} />
      <Section title={t('tournaments.running')} items={running} people={people} />
      <Section title={t('tournaments.past')} items={past} people={people} />
    </Screen>
  );
}

function Section({ title, items, people }: { title: string; items: Tournament[]; people: People }) {
  const i18n = useI18n();
  const { t } = i18n;
  if (!items.length) return null;
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      {items.map((tour) => {
        const confirmed = confirmedPairs(tour).length;
        const champion = tour.status === 'finished' ? pairName(tour.pairs.find((p) => p.id === tour.championPairId), people) : undefined;
        return (
          <TournamentCard
            key={tour.id}
            name={tour.name}
            when={i18n.formatWhen(tour.startsAt)}
            place={tour.place}
            sizeLabel={t('tournament.players', { n: tour.maxPairs * 2 })}
            confirmedPairs={confirmed}
            maxPairs={tour.maxPairs}
            progressLabel={t('tournament.pairsProgress', { count: confirmed, max: tour.maxPairs })}
            progressA11yLabel={t('tournament.pairsA11y')}
            status={tournamentStatus(tour, i18n)}
            champion={champion}
            onPress={() => router.push(`/tournament/${tour.id}`)}
          />
        );
      })}
    </>
  );
}

function Invite({ text, busy, onAccept, onDecline }: { text: string; busy: string | null; onAccept: () => void; onDecline: () => void }) {
  const t = useTheme();
  const { t: tr } = useI18n();
  return (
    <Card style={{ borderColor: t.color.accent, borderWidth: 2 }}>
      <View style={{ gap: t.space[3] }} accessibilityLiveRegion="polite">
        <AppText variant="label">{text}</AppText>
        <View style={{ flexDirection: 'row', gap: t.space[2] }}>
          <Button label={tr('tournaments.accept')} size="sm" loading={busy === 'accept'} onPress={onAccept} />
          <Button label={tr('tournaments.decline')} size="sm" variant="secondary" loading={busy === 'decline'} onPress={onDecline} />
        </View>
      </View>
    </Card>
  );
}
