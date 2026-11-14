import { router, useLocalSearchParams } from 'expo-router';
import { CircleAlert, ClipboardPen, Gavel, LogOut, Trophy, UserPlus } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { PlayerRow, PlayerSlot, ScoreLine } from '@/components/app';
import { AppText, Badge, Button, Card, ConfirmDialog, ErrorState, LevelChip, LoadingCards, Screen, useToast } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import { LEVEL_MAX, LEVEL_MIN, matchActions, teamOfPlayer } from '@/data/rules';
import type { Match } from '@/data/types';
import { useAction } from '@/data/useAction';
import { loadPeople, nameOf, type People } from '@/features/matches';
import { SectionTitle } from '@/features/SectionTitle';
import { useI18n } from '@/i18n';
import { registerForPush } from '@/lib/push';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme';

type Dialog = 'leave' | 'cancel' | 'dispute' | null;

// S07 Match detail: who plays, and every action the player can take on it.
export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const me = useUserId();
  const i18n = useI18n();
  const { t } = i18n;
  const { busy, run } = useAction();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const now = useNow();
  const theme = useTheme();

  const q = useQuery(`match-${id}`, async () => {
    const m = await api.getMatch(id);
    return { m, people: await loadPeople(api, [m]) };
  });

  if (q.loading) {
    return (
      <Screen>
        <LoadingCards count={2} />
      </Screen>
    );
  }
  if (q.error || !q.data) {
    const notFound = q.error?.code === 'match_not_found';
    return (
      <Screen>
        <ErrorState onRetry={q.refetch} message={notFound ? t('matchDetail.notFound') : undefined} />
      </Screen>
    );
  }

  const { m, people } = q.data;
  const a = matchActions(m, me, now);

  // joining either takes a slot or, outside the level range, sends a request; the toast says which
  async function joinWithFeedback() {
    // assigned inside the callback, so TypeScript must not narrow it to 'joined'
    let outcome = 'joined' as 'joined' | 'requested';
    const ok = await run('join', async () => {
      outcome = await api.joinMatch(m.id);
    });
    if (ok) {
      toast(outcome === 'requested' ? t('matchDetail.requestSent') : t('matchDetail.joined'), 'success');
      // the first match is when reminders start to matter: ask for push permission now
      registerForPush(api, { ask: true });
    }
  }

  const hasActions = a.canSubmitResult || a.canJoin || a.canLeave || a.canCancel;
  const footer = hasActions ? <Actions m={m} a={a} busy={busy} onJoin={joinWithFeedback} onAsk={setDialog} /> : undefined;

  return (
    <Screen onRefresh={q.refetch} footer={footer}>
      <Header m={m} people={people} />
      <Banners m={m} a={a} now={now} />
      <SectionTitle>{t('matchDetail.players')}</SectionTitle>
      <Teams m={m} people={people} me={me} onJoin={a.canJoin ? joinWithFeedback : undefined} />
      {a.isHost ? <Requests m={m} people={people} busy={busy} onAccept={(pid) => run('accept', () => api.acceptRequest(m.id, pid), t('matchDetail.accepted'))} /> : null}
      {m.result ? (
        <ResultBlock
          m={m}
          people={people}
          a={a}
          busy={busy}
          onConfirm={() => run('confirm', () => api.confirmResult(m.id), t('matchDetail.confirmed'))}
          onDispute={() => setDialog('dispute')}
          onHostConfirm={() => run('hostConfirm', () => api.hostConfirmResult(m.id), t('matchDetail.confirmed'))}
        />
      ) : null}
      {a.canOrganizerSet ? (
        <Card>
          <View style={{ gap: theme.space[2] }}>
            <AppText variant="bodySm" tone="textMuted">
              {t('matchDetail.organizerSetHelp')}
            </AppText>
            <Button label={t('matchDetail.organizerSet')} variant="gold" icon={Gavel} onPress={() => router.push(`/match/${m.id}/result?as=organizer`)} />
          </View>
        </Card>
      ) : null}
      {/* tournament matches carry the tournament's name as notes; the header already shows it */}
      {m.notes && !m.tournamentId ? (
        <>
          <SectionTitle>{t('matchDetail.notes')}</SectionTitle>
          <AppText>{m.notes}</AppText>
        </>
      ) : null}

      <ConfirmDialog
        visible={dialog === 'leave'}
        title={t('matchDetail.leaveTitle')}
        body={t('matchDetail.leaveBody')}
        confirmLabel={t('matchDetail.leave')}
        cancelLabel={t('matchDetail.keep')}
        destructive
        loading={busy === 'leave'}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          await run('leave', () => api.leaveMatch(m.id), t('matchDetail.left'));
          setDialog(null);
        }}
      />
      <ConfirmDialog
        visible={dialog === 'cancel'}
        title={t('matchDetail.cancelTitle')}
        body={t('matchDetail.cancelBody')}
        confirmLabel={t('matchDetail.cancel')}
        cancelLabel={t('matchDetail.keep')}
        destructive
        loading={busy === 'cancel'}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          await run('cancel', () => api.cancelMatch(m.id), t('matchDetail.cancelled'));
          setDialog(null);
        }}
      />
      <ConfirmDialog
        visible={dialog === 'dispute'}
        title={t('matchDetail.disputeTitle')}
        body={t('matchDetail.disputeBody')}
        confirmLabel={t('matchDetail.dispute')}
        cancelLabel={t('matchDetail.keep')}
        destructive
        loading={busy === 'dispute'}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          await run('dispute', () => api.disputeResult(m.id), t('matchDetail.disputed'));
          setDialog(null);
        }}
      />
    </Screen>
  );
}

type ActionSet = ReturnType<typeof matchActions>;

function Header({ m, people }: { m: Match; people: People }) {
  const t = useTheme();
  const i18n = useI18n();
  const { t: tr } = i18n;
  const fullRange = m.levelMin <= LEVEL_MIN && m.levelMax >= LEVEL_MAX;
  return (
    <View style={{ gap: t.space[2] }}>
      <AppText variant="display" tone={m.status === 'cancelled' ? 'textMuted' : 'text'}>
        {i18n.formatWhen(m.startsAt)}
      </AppText>
      <AppText tone="textMuted">{`${m.place} · ${tr('common.minutes', { n: m.durationMinutes })} · ${tr('matchDetail.host', { name: nameOf(people, m.hostId) })}`}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
        <Badge label={m.type === 'competitive' ? tr('match.typeCompetitive') : tr('match.typeFriendly')} tone={m.type === 'competitive' ? 'gold' : 'neutral'} />
        {fullRange ? null : <LevelChip range={[m.levelMin, m.levelMax]} size="sm" locale={i18n.intlLocale} prefix={tr('common.level')} />}
      </View>
      {m.tournamentId ? (
        // a tournament match keeps the tournament's name in its notes (create_tie_match)
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: t.space[2] }}>
          <Badge label={tr('matchDetail.tournament', { name: m.notes ?? '' })} tone="gold" icon={Trophy} />
          <Button label={tr('matchDetail.seeTournament')} variant="ghost" size="sm" onPress={() => router.push(`/tournament/${m.tournamentId}`)} />
        </View>
      ) : null}
    </View>
  );
}

function Banners({ m, a, now }: { m: Match; a: ActionSet; now: number }) {
  const { t } = useI18n();
  const messages: string[] = [];
  if (m.status === 'cancelled') messages.push(t('matchDetail.cancelledBanner'));
  if (a.requested) messages.push(t('matchDetail.requestedInfo'));
  if (m.result?.status === 'disputed') messages.push(t('matchDetail.disputedBanner'));
  if (m.status === 'full' && !m.result && new Date(m.startsAt).getTime() <= now) messages.push(t('matchDetail.awaitingResult'));
  if (!messages.length) return null;
  return (
    <>
      {messages.map((text) => (
        <Notice key={text} text={text} />
      ))}
    </>
  );
}

function Notice({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', gap: t.space[2], padding: t.space[3], borderRadius: t.radius.md, backgroundColor: t.color.warningSoft }}>
      <CircleAlert color={t.color.warning} size={20} />
      <AppText variant="bodySm" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

function Teams({ m, people, me, onJoin }: { m: Match; people: People; me: string | null; onJoin?: () => void }) {
  const t = useTheme();
  const { t: tr } = useI18n();
  const slot = (n: number) => m.players.find((p) => p.slot === n && p.status === 'joined');
  const team = (label: string, slots: number[]) => (
    <View style={{ gap: t.space[2] }}>
      <AppText variant="label" tone="textMuted">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', gap: t.space[3] }}>
        {slots.map((n) => {
          const p = slot(n);
          return (
            <PlayerSlot
              key={n}
              teamLabel={label}
              me={p?.playerId === me}
              meLabel={tr('common.you')}
              joinLabel={tr('matchDetail.join')}
              player={p ? { name: nameOf(people, p.playerId), uri: people[p.playerId]?.avatarUrl, level: people[p.playerId]?.level } : null}
              onJoin={onJoin}
            />
          );
        })}
      </View>
    </View>
  );
  return (
    <View style={{ gap: t.space[3] }}>
      {team(tr('common.teamA'), [1, 2])}
      {team(tr('common.teamB'), [3, 4])}
    </View>
  );
}

function Requests({ m, people, busy, onAccept }: { m: Match; people: People; busy: string | null; onAccept: (playerId: string) => void }) {
  const t = useTheme();
  const { t: tr } = useI18n();
  const requests = m.players.filter((p) => p.status === 'requested');
  if (!requests.length) return null;
  return (
    <View style={{ gap: t.space[2] }}>
      <SectionTitle>{tr('matchDetail.requests')}</SectionTitle>
      {requests.map((r) => (
        <View key={r.playerId} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
          <View style={{ flex: 1, borderRadius: t.radius.md, overflow: 'hidden' }}>
            <PlayerRow name={nameOf(people, r.playerId)} level={people[r.playerId]?.level} />
          </View>
          <Button label={tr('matchDetail.accept')} size="sm" loading={busy === 'accept'} disabled={m.status !== 'open'} onPress={() => onAccept(r.playerId)} />
        </View>
      ))}
    </View>
  );
}

function ResultBlock({
  m,
  people,
  a,
  busy,
  onConfirm,
  onDispute,
  onHostConfirm,
}: {
  m: Match;
  people: People;
  a: ActionSet;
  busy: string | null;
  onConfirm: () => void;
  onDispute: () => void;
  onHostConfirm: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useI18n();
  const r = m.result!;
  const status =
    r.status === 'confirmed'
      ? { label: tr('match.statusPlayed'), tone: 'neutral' as const }
      : r.status === 'pending'
        ? { label: tr('match.pending'), tone: 'warning' as const }
        : { label: tr('match.disputed'), tone: 'warning' as const };
  const mine = a.myTeam && r.status === 'confirmed' ? (a.myTeam === r.winnerTeam ? { label: tr('match.won'), tone: 'success' as const } : { label: tr('match.lost'), tone: 'danger' as const }) : null;
  const iSubmittedSide = a.myTeam && a.myTeam === teamOfPlayer(m, r.submittedBy);
  return (
    <View style={{ gap: t.space[2] }}>
      <SectionTitle>{tr('matchDetail.result')}</SectionTitle>
      <Card>
        <View style={{ gap: t.space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[2] }}>
            <ScoreLine sets={r.sets} variant="title" />
            <Badge {...(mine ?? status)} />
          </View>
          <AppText variant="caption" tone="textMuted">
            {`${tr('common.teamA')} – ${tr('common.teamB')} · ${tr('matchDetail.submittedBy', { name: nameOf(people, r.submittedBy) })}`}
          </AppText>
          {r.status === 'pending' && iSubmittedSide ? <AppText variant="bodySm">{tr('matchDetail.waitingRival')}</AppText> : null}
          {a.canConfirm || a.canDispute ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
              <Button label={tr('matchDetail.confirm')} loading={busy === 'confirm'} onPress={onConfirm} />
              <Button label={tr('matchDetail.dispute')} variant="secondary" onPress={onDispute} />
            </View>
          ) : null}
          {a.canHostConfirm ? (
            <View style={{ gap: t.space[2] }}>
              <AppText variant="bodySm" tone="textMuted">
                {tr('matchDetail.hostConfirmHelp')}
              </AppText>
              <Button label={tr('matchDetail.hostConfirm')} variant="gold" loading={busy === 'hostConfirm'} onPress={onHostConfirm} />
            </View>
          ) : null}
        </View>
      </Card>
    </View>
  );
}

function Actions({ m, a, busy, onJoin, onAsk }: { m: Match; a: ActionSet; busy: string | null; onJoin: () => void; onAsk: (d: Dialog) => void }) {
  const t = useTheme();
  const { t: tr } = useI18n();
  const buttons: ReactNode[] = [];
  if (a.canSubmitResult)
    buttons.push(
      <Button
        key="result"
        label={m.result?.status === 'disputed' ? tr('matchDetail.enterResultAgain') : tr('matchDetail.enterResult')}
        icon={ClipboardPen}
        size="lg"
        fullWidth
        onPress={() => router.push(`/match/${m.id}/result`)}
      />,
    );
  if (a.canJoin) buttons.push(<Button key="join" label={tr('matchDetail.join')} icon={UserPlus} size="lg" fullWidth loading={busy === 'join'} onPress={onJoin} />);
  if (a.canLeave) buttons.push(<Button key="leave" label={tr('matchDetail.leave')} icon={LogOut} variant="secondary" fullWidth onPress={() => onAsk('leave')} />);
  if (a.canCancel) buttons.push(<Button key="cancel" label={tr('matchDetail.cancel')} variant="ghost" fullWidth onPress={() => onAsk('cancel')} />);
  return <View style={{ gap: t.space[2] }}>{buttons}</View>;
}
