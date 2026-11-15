import { router, useLocalSearchParams } from 'expo-router';
import { ClipboardX, Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';

import { SetScoreRow } from '@/components/app';
import { AppText, Button, EmptyState, ErrorState, LoadingCards, Screen } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import { matchActions } from '@/data/rules';
import type { SetScore } from '@/data/types';
import { useAction } from '@/data/useAction';
import { loadPeople, nameOf } from '@/features/matches';
import { useI18n } from '@/i18n';

// S08 Enter the result, set by set. The other team then confirms it on S07.
// With ?as=organizer the tournament organizer sets it, and it counts straight away.
export default function EnterResult() {
  const { id, as } = useLocalSearchParams<{ id: string; as?: string }>();
  const asOrganizer = as === 'organizer';
  const api = useApi();
  const me = useUserId();
  const { t } = useI18n();
  const { busy, run } = useAction();
  const [sets, setSets] = useState<SetScore[]>([
    { a: 0, b: 0 },
    { a: 0, b: 0 },
  ]);
  const [tried, setTried] = useState(false);

  const q = useQuery(`match-${id}`, async () => {
    const m = await api.getMatch(id);
    return { m, people: await loadPeople(api, [m]) };
  });

  if (q.loading)
    return (
      <Screen>
        <LoadingCards count={1} />
      </Screen>
    );
  if (q.error || !q.data)
    return (
      <Screen>
        <ErrorState onRetry={q.refetch} />
      </Screen>
    );

  const { m, people } = q.data;
  const allowed = asOrganizer ? matchActions(m, me).canOrganizerSet : matchActions(m, me).canSubmitResult;
  if (!allowed) {
    return (
      <Screen>
        <EmptyState icon={ClipboardX} title={t('errors.result_not_allowed')} actionLabel={t('matchDetail.keep')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const teamName = (slots: number[]) => {
    const names = slots.map((s) => m.players.find((p) => p.slot === s && p.status === 'joined')?.playerId).map((pid) => nameOf(people, pid).split(' ')[0]);
    return t('common.and', { a: names[0], b: names[1] });
  };
  const teamA = `${t('common.teamA')} (${teamName([1, 2])})`;
  const teamB = `${t('common.teamB')} (${teamName([3, 4])})`;

  // a tied set is flagged as soon as games are entered; "nobody wins" only after trying to send
  const tieError = (s: SetScore) => (s.a === s.b && (tried || s.a + s.b > 0) ? t('result.tie') : undefined);
  const winsA = sets.filter((s) => s.a > s.b).length;
  const winsB = sets.filter((s) => s.b > s.a).length;
  const anyTie = sets.some((s) => s.a === s.b);
  const noWinner = tried && !anyTie && winsA === winsB;

  async function submit() {
    setTried(true);
    if (anyTie || winsA === winsB) return;
    const ok = asOrganizer
      ? await run('submit', () => api.organizerSetResult(m.id, sets), t('result.organizerSent'))
      : await run('submit', () => api.submitResult(m.id, sets), t('result.sent'));
    if (ok) router.back();
  }

  return (
    <Screen footer={<Button label={t('result.submit')} size="lg" fullWidth loading={busy === 'submit'} onPress={submit} />}>
      <AppText tone="textMuted">{asOrganizer ? t('result.organizerHelp') : t('result.help')}</AppText>
      <Legend teamA={teamA} teamB={teamB} />
      {sets.map((s, i) => (
        <SetScoreRow
          key={i}
          setLabel={t('result.set', { n: i + 1 })}
          a={s.a}
          b={s.b}
          teamALabel={teamA}
          teamBLabel={teamB}
          error={tieError(s)}
          onChange={(a, b) => setSets((all) => all.map((x, j) => (j === i ? { a, b } : x)))}
        />
      ))}
      {noWinner ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {t('result.noWinner')}
        </AppText>
      ) : null}
      {sets.length < 3 ? (
        <Button label={t('result.addSet')} icon={Plus} variant="secondary" onPress={() => setSets((all) => [...all, { a: 0, b: 0 }])} />
      ) : (
        <Button label={t('result.removeSet')} icon={Minus} variant="ghost" onPress={() => setSets((all) => all.slice(0, 2))} />
      )}
    </Screen>
  );
}

/** Which side is which, above the counters: left is team A, right is team B. */
function Legend({ teamA, teamB }: { teamA: string; teamB: string }) {
  return (
    <AppText variant="label">
      {teamA}
      {'  –  '}
      {teamB}
    </AppText>
  );
}
