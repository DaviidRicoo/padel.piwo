import type { MatchCardProps, SlotPlayer } from '@/components/app/MatchCard';
import type { BadgeTone } from '@/components/ui';
import type { Api } from '@/data/api';
import { freeSlots, hasStarted, LEVEL_MAX, LEVEL_MIN, teamOfPlayer } from '@/data/rules';
import type { Id, Match, Profile } from '@/data/types';
import type { I18n } from '@/i18n';

export type People = Record<Id, Profile>;

/** Everyone who appears in these matches, by id. */
export async function loadPeople(api: Api, matches: Match[], extra: Id[] = []): Promise<People> {
  const ids = new Set<Id>(extra);
  for (const m of matches) {
    ids.add(m.hostId);
    m.players.forEach((p) => ids.add(p.playerId));
    if (m.result) ids.add(m.result.submittedBy);
  }
  const list = await api.getProfiles([...ids]);
  return Object.fromEntries(list.map((p) => [p.id, p]));
}

export function nameOf(people: People, id: Id | null | undefined): string {
  return (id && people[id]?.displayName) || '—';
}

/** The result as the viewer sees it: win, loss, to confirm, disputed or missing. */
export function resultBadgeFor(m: Match, me: Id | null, i18n: I18n): { label: string; tone: BadgeTone } | undefined {
  const { t } = i18n;
  const r = m.result;
  if (!r) return m.status === 'full' && hasStarted(m) ? { label: t('match.statusAwaitingResult'), tone: 'warning' } : undefined;
  if (r.status === 'pending') return { label: t('match.pending'), tone: 'warning' };
  if (r.status === 'disputed') return { label: t('match.disputed'), tone: 'warning' };
  const myTeam = me ? teamOfPlayer(m, me) : null;
  if (!myTeam) return { label: t('match.statusPlayed'), tone: 'neutral' };
  return myTeam === r.winnerTeam ? { label: t('match.won'), tone: 'success' } : { label: t('match.lost'), tone: 'danger' };
}

export function statusLabelFor(m: Match, me: Id | null, i18n: I18n): string {
  const { t, tn } = i18n;
  if (m.players.some((p) => p.playerId === me && p.status === 'requested')) return t('match.statusRequested');
  switch (m.status) {
    case 'open':
      return tn('match.slotsFree', freeSlots(m));
    case 'full':
      return hasStarted(m) ? t('match.statusAwaitingResult') : t('match.statusFull');
    case 'played':
      return t('match.statusPlayed');
    case 'cancelled':
      return t('match.statusCancelled');
  }
}

/** Everything MatchCard needs, from a match and the people in it. */
export function toMatchCard(m: Match, people: People, me: Id | null, i18n: I18n): Omit<MatchCardProps, 'onPress'> {
  const { t } = i18n;
  const slots: (SlotPlayer | null)[] = [1, 2, 3, 4].map((slot) => {
    const p = m.players.find((x) => x.slot === slot && x.status === 'joined');
    if (!p) return null;
    return { name: nameOf(people, p.playerId), uri: people[p.playerId]?.avatarUrl, me: p.playerId === me };
  });
  const fullRange = m.levelMin <= LEVEL_MIN && m.levelMax >= LEVEL_MAX;
  return {
    when: i18n.formatWhen(m.startsAt),
    place: m.place,
    duration: t('common.minutes', { n: m.durationMinutes }),
    typeLabel: m.type === 'competitive' ? t('match.typeCompetitive') : t('match.typeFriendly'),
    competitive: m.type === 'competitive',
    levelRange: fullRange ? undefined : [m.levelMin, m.levelMax],
    slots,
    status: m.status,
    statusLabel: statusLabelFor(m, me, i18n),
    sets: m.result?.sets,
    resultBadge: resultBadgeFor(m, me, i18n),
    freeSlotLabel: t('matchDetail.join'),
  };
}
