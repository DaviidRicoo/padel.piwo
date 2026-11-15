import type { BracketRound } from '@/components/app';
import type { BadgeTone } from '@/components/ui';
import type { Api } from '@/data/api';
import { roundsFor } from '@/data/rules';
import type { Id, Match, Tournament, TournamentPair } from '@/data/types';
import type { I18n } from '@/i18n';

import type { People } from './matches';

/** Everyone in these tournaments (organizers and both members of every pair). */
export async function loadTournamentPeople(api: Api, list: Tournament[], extra: Id[] = []): Promise<People> {
  const ids = new Set<Id>(extra);
  for (const t of list) {
    ids.add(t.organizerId);
    t.pairs.forEach((p) => {
      ids.add(p.player1Id);
      ids.add(p.player2Id);
    });
  }
  const profiles = await api.getProfiles([...ids]);
  return Object.fromEntries(profiles.map((p) => [p.id, p]));
}

const firstName = (people: People, id: Id) => people[id]?.displayName.split(' ')[0] ?? '—';

/** "Ana / Kasia" (short, for the bracket) or "Ana García / Kasia Wójcik". */
export function pairName(pair: TournamentPair | undefined, people: People, short = false): string | undefined {
  if (!pair) return undefined;
  const name = (id: Id) => (short ? firstName(people, id) : (people[id]?.displayName ?? '—'));
  return `${name(pair.player1Id)} / ${name(pair.player2Id)}`;
}

export function tournamentStatus(t: Tournament, i18n: I18n): { label: string; tone: BadgeTone } {
  const { t: tr } = i18n;
  switch (t.status) {
    case 'registration':
      return { label: tr('tournament.statusRegistration'), tone: 'accent' };
    case 'in_progress':
      return { label: tr('tournament.statusInProgress'), tone: 'gold' };
    case 'finished':
      return { label: tr('tournament.statusFinished'), tone: 'neutral' };
    case 'cancelled':
      return { label: tr('tournament.statusCancelled'), tone: 'neutral' };
  }
}

/** Round titles counted back from the final: ... Cuartos, Semifinal, Final. */
export function roundTitle(roundNo: number, maxPairs: number, i18n: I18n): string {
  const fromEnd = roundsFor(maxPairs) - roundNo;
  const { t } = i18n;
  return [t('bracket.final'), t('bracket.semi'), t('bracket.quarter'), t('bracket.round16')][fromEnd] ?? t('bracket.round16');
}

/** The bracket as Bracket draws it, with the score of every match that has a confirmed result. */
export function toBracket(t: Tournament, matches: Record<Id, Match>, people: People, i18n: I18n): { rounds: BracketRound[]; champion?: string } {
  const byId = (id: Id | null) => t.pairs.find((p) => p.id === id);
  const rounds: BracketRound[] = [];
  for (let r = 1; r <= roundsFor(t.maxPairs); r++) {
    rounds.push({
      title: roundTitle(r, t.maxPairs, i18n),
      ties: t.ties
        .filter((x) => x.roundNo === r)
        .sort((a, b) => a.pos - b.pos)
        .map((x) => {
          const m = x.matchId ? matches[x.matchId] : undefined;
          const confirmed = m?.result?.status === 'confirmed';
          return {
            id: x.id,
            matchId: x.matchId ?? undefined,
            a: pairName(byId(x.pairAId), people, true),
            b: pairName(byId(x.pairBId), people, true),
            sets: confirmed ? m!.result!.sets : undefined,
            winner: x.winnerPairId ? (x.winnerPairId === x.pairAId ? 'a' : 'b') : undefined,
          };
        }),
    });
  }
  return { rounds, champion: pairName(byId(t.championPairId), people) };
}
