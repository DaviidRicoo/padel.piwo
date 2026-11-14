import { router, useLocalSearchParams } from 'expo-router';
import { CircleAlert, GitBranch, Trophy, UserPlus } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { MatchCard } from '@/components/app';
import { AppText, Avatar, Badge, Button, Card, ConfirmDialog, ErrorState, LoadingCards, ProgressBar, Screen } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import { confirmedPairs, livePairOf } from '@/data/rules';
import type { Match, Tournament } from '@/data/types';
import { useAction } from '@/data/useAction';
import { loadPeople, nameOf, toMatchCard, type People } from '@/features/matches';
import { SectionTitle } from '@/features/SectionTitle';
import { loadTournamentPeople, pairName, tournamentStatus } from '@/features/tournaments';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

type Dialog = 'withdraw' | 'cancel' | null;

// S19 Tournament: details, pairs, my place in it, and what I can do.
export default function TournamentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const api = useApi();
  const me = useUserId();
  const i18n = useI18n();
  const { t: tr } = i18n;
  const { busy, run } = useAction();
  const [dialog, setDialog] = useState<Dialog>(null);

  const q = useQuery(`tournament-${id}`, async () => {
    const tour = await api.getTournament(id);
    // my next match in this tournament, if the draw gave me one
    const mine = tour.ties.map((x) => x.matchId).filter((x): x is string => !!x);
    const matches = await Promise.all(mine.map((mid) => api.getMatch(mid)));
    const next = matches.find((m) => m.status === 'full' && m.players.some((p) => p.playerId === me));
    const people = await loadTournamentPeople(api, [tour]);
    const matchPeople = next ? await loadPeople(api, [next]) : {};
    return { tour, people: { ...people, ...matchPeople }, next };
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
        <ErrorState onRetry={q.refetch} message={q.error?.code === 'tournament_not_found' ? tr('tournament.notFound') : undefined} />
      </Screen>
    );

  const { tour, people, next } = q.data;
  const myPair = livePairOf(tour, me);
  const confirmed = confirmedPairs(tour);
  const isOrganizer = tour.organizerId === me;
  const open = tour.status === 'registration';
  const drawn = tour.status === 'in_progress' || tour.status === 'finished';
  const partnerOf = (pairId: string) => {
    const p = tour.pairs.find((x) => x.id === pairId)!;
    return p.player1Id === me ? p.player2Id : p.player1Id;
  };

  const actions: ReactNode[] = [];
  if (open && !myPair)
    actions.push(<Button key="register" label={tr('tournament.register')} icon={UserPlus} size="lg" fullWidth onPress={() => router.push(`/tournament/${tour.id}/register`)} />);
  if (drawn) actions.push(<Button key="bracket" label={tr('tournament.bracket')} icon={GitBranch} size="lg" fullWidth variant={open ? 'secondary' : 'primary'} onPress={() => router.push(`/tournament/${tour.id}/bracket`)} />);
  if (open && myPair && !(myPair.status === 'pending' && myPair.player2Id === me))
    actions.push(<Button key="withdraw" label={tr('tournament.withdraw')} variant="secondary" fullWidth onPress={() => setDialog('withdraw')} />);
  if (isOrganizer && (open || tour.status === 'in_progress'))
    actions.push(<Button key="cancel" label={tr('tournament.cancel')} variant="ghost" fullWidth onPress={() => setDialog('cancel')} />);

  return (
    <Screen onRefresh={q.refetch} footer={actions.length ? <View style={{ gap: t.space[2] }}>{actions}</View> : undefined}>
      <Header tour={tour} people={people} />

      {tour.status === 'cancelled' ? <Notice text={tr('tournament.cancelledBanner')} /> : null}
      {tour.status === 'finished' ? (
        <Card style={{ borderColor: t.color.gold, borderWidth: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
            <Trophy color={t.color.goldText} size={32} />
            <AppText variant="heading" style={{ flex: 1 }}>
              {tr('tournament.champions', { names: pairName(tour.pairs.find((p) => p.id === tour.championPairId), people) ?? '—' })}
            </AppText>
          </View>
        </Card>
      ) : null}

      {myPair && open ? (
        myPair.status === 'confirmed' ? (
          <Notice tone="info" text={tr('tournament.youAreIn', { name: nameOf(people, partnerOf(myPair.id)) })} />
        ) : myPair.player1Id === me ? (
          <Notice tone="info" text={tr('tournament.waitingPartner', { name: nameOf(people, myPair.player2Id) })} />
        ) : (
          <Card style={{ borderColor: t.color.accent, borderWidth: 2 }}>
            <View style={{ gap: t.space[3] }}>
              <AppText variant="label">{tr('tournaments.invite', { name: nameOf(people, myPair.player1Id), tournament: tour.name })}</AppText>
              <View style={{ flexDirection: 'row', gap: t.space[2] }}>
                <Button label={tr('tournaments.accept')} size="sm" loading={busy === 'accept'} onPress={() => run('accept', () => api.respondPairInvite(myPair.id, true), tr('tournaments.accepted'))} />
                <Button
                  label={tr('tournaments.decline')}
                  size="sm"
                  variant="secondary"
                  loading={busy === 'decline'}
                  onPress={() => run('decline', () => api.respondPairInvite(myPair.id, false), tr('tournaments.declined'))}
                />
              </View>
            </View>
          </Card>
        )
      ) : null}

      {next ? <NextMatch m={next} people={people} /> : null}

      {open ? (
        <View style={{ gap: t.space[1] }}>
          <ProgressBar value={confirmed.length} max={tour.maxPairs} accessibilityLabel={tr('tournament.pairsA11y')} />
          <AppText variant="caption" tone="textMuted">
            {`${tr('tournament.pairsProgress', { count: confirmed.length, max: tour.maxPairs })} · ${tr('tournament.drawInfo')}`}
          </AppText>
        </View>
      ) : null}

      <SectionTitle>{tr('tournament.pairs')}</SectionTitle>
      <Pairs tour={tour} people={people} />

      <ConfirmDialog
        visible={dialog === 'withdraw'}
        title={tr('tournament.withdrawTitle')}
        body={tr('tournament.withdrawBody')}
        confirmLabel={tr('tournament.withdraw')}
        cancelLabel={tr('matchDetail.keep')}
        destructive
        loading={busy === 'withdraw'}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          await run('withdraw', () => api.withdrawPair(myPair!.id), tr('tournament.withdrawn'));
          setDialog(null);
        }}
      />
      <ConfirmDialog
        visible={dialog === 'cancel'}
        title={tr('tournament.cancelTitle')}
        body={tr('tournament.cancelBody')}
        confirmLabel={tr('tournament.cancel')}
        cancelLabel={tr('matchDetail.keep')}
        destructive
        loading={busy === 'cancel'}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          await run('cancel', () => api.cancelTournament(tour.id), tr('tournament.cancelled'));
          setDialog(null);
        }}
      />
    </Screen>
  );
}

function Header({ tour, people }: { tour: Tournament; people: People }) {
  const t = useTheme();
  const i18n = useI18n();
  const { t: tr } = i18n;
  return (
    <View style={{ gap: t.space[2] }}>
      <AppText variant="display">{tour.name}</AppText>
      <AppText tone="textMuted">
        {[i18n.formatWhen(tour.startsAt), tour.place, tr('tournament.players', { n: tour.maxPairs * 2 }), tr('tournament.roundDays', { n: tour.roundDays })].join(' · ')}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: t.space[2] }}>
        <Badge {...tournamentStatus(tour, i18n)} />
        <AppText variant="bodySm" tone="textMuted">
          {tr('tournament.organizer', { name: nameOf(people, tour.organizerId) })}
        </AppText>
      </View>
      {tour.description ? <AppText>{tour.description}</AppText> : null}
    </View>
  );
}

function Pairs({ tour, people }: { tour: Tournament; people: People }) {
  const t = useTheme();
  const { t: tr } = useI18n();
  const live = tour.pairs.filter((p) => p.status !== 'withdrawn').sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));
  if (!live.length)
    return (
      <AppText variant="bodySm" tone="textMuted">
        {tr('tournament.noPairs')}
      </AppText>
    );
  return (
    <View style={{ borderRadius: t.radius.lg, overflow: 'hidden' }}>
      {live.map((p, i) => (
        <View
          key={p.id}
          accessible
          accessibilityLabel={[pairName(p, people), p.status === 'pending' ? tr('tournament.pending') : null, p.id === tour.championPairId ? tr('bracket.champions') : null]
            .filter(Boolean)
            .join(', ')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space[3],
            minHeight: 64,
            paddingHorizontal: t.space[4],
            paddingVertical: t.space[2],
            borderTopWidth: i ? 1 : 0,
            borderColor: t.color.border,
            backgroundColor: t.color.surface,
          }}>
          {/* both players' avatars, overlapping */}
          <View style={{ flexDirection: 'row' }}>
            <Avatar name={nameOf(people, p.player1Id)} uri={people[p.player1Id]?.avatarUrl} size={32} />
            <View style={{ marginLeft: -t.space[2] }}>
              <Avatar name={nameOf(people, p.player2Id)} uri={people[p.player2Id]?.avatarUrl} size={32} />
            </View>
          </View>
          <AppText variant="label" style={{ flex: 1 }}>
            {pairName(p, people)}
          </AppText>
          {p.status === 'pending' ? <Badge label={tr('tournament.pending')} tone="warning" /> : null}
          {p.id === tour.championPairId ? <Badge label={tr('bracket.champions')} tone="gold" icon={Trophy} /> : null}
        </View>
      ))}
    </View>
  );
}

function NextMatch({ m, people }: { m: Match; people: People }) {
  const t = useTheme();
  const me = useUserId();
  const i18n = useI18n();
  return (
    <View style={{ gap: t.space[2] }}>
      <SectionTitle>{i18n.t('tournament.myMatch')}</SectionTitle>
      <MatchCard {...toMatchCard(m, people, me, i18n)} onPress={() => router.push(`/match/${m.id}`)} />
    </View>
  );
}

function Notice({ text, tone = 'warning' }: { text: string; tone?: 'warning' | 'info' }) {
  const t = useTheme();
  const color = tone === 'warning' ? t.color.warning : t.color.accentText;
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: t.space[2], padding: t.space[3], borderRadius: t.radius.md, backgroundColor: tone === 'warning' ? t.color.warningSoft : t.color.accentSoft }}>
      <CircleAlert color={color} size={20} />
      <AppText variant="bodySm" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
