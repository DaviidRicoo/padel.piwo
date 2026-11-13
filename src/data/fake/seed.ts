// Sample data for the fake data layer: invented residents and matches placed
// around "now", so every screen and state has something real to show.
// Sign in with any seed email and the password below.
import { addDays, addMinutes, upcomingDays, zonedToUtc } from '@/lib/time';

import type { AppNotification, Match, MatchPlayer, Profile, SetScore, Tournament, TournamentPair, TournamentTie } from '../types';

export const SEED_PASSWORD = 'padel1234';

const PEOPLE: [string, string, number][] = [
  // id suffix, name, starting level (as if from the questionnaire)
  ['ana', 'Ana García', 4.0],
  ['marc', 'Marc Ruiz', 4.6],
  ['eva', 'Eva Nowak', 5.2],
  ['luis', 'Luis Gil', 3.6],
  ['piotr', 'Piotr Zieliński', 4.4],
  ['kasia', 'Kasia Wójcik', 3.9],
  ['jan', 'Jan Kowalski', 5.0],
  ['ola', 'Ola Lewandowska', 3.3],
  ['diego', 'Diego Martín', 4.8],
  ['lucia', 'Lucía Pérez', 4.2],
  ['tomek', 'Tomek Nowicki', 3.0],
  ['sara', 'Sara López', 4.5],
];

export interface SeedAccount {
  email: string;
  password: string;
  profileId: string;
}

export interface SeedState {
  profiles: Profile[];
  accounts: SeedAccount[];
  matches: Match[];
  tournaments: Tournament[];
  notifications: (AppNotification & { playerId: string })[];
}

function winnerOfSets(sets: SetScore[]): 'A' | 'B' {
  return sets.filter((s) => s.a > s.b).length > sets.filter((s) => s.b > s.a).length ? 'A' : 'B';
}

const p = (key: string) => `p_${key}`;

function players(keys: string[]): MatchPlayer[] {
  return keys.map((k, i) => ({ playerId: p(k), slot: (i + 1) as MatchPlayer['slot'], status: 'joined' as const }));
}

export function buildSeed(now = new Date()): SeedState {
  const created = addDays(now, -60).toISOString();
  const profiles: Profile[] = PEOPLE.map(([key, name, level]) => ({
    id: p(key),
    displayName: name,
    avatarUrl: null,
    city: 'Gdańsk',
    hand: key === 'luis' || key === 'kasia' ? 'left' : 'right',
    courtSide: key === 'marc' || key === 'eva' ? 'left' : key === 'ana' ? 'right' : 'both',
    level,
    reliability: 0,
    locale: key === 'piotr' || key === 'kasia' || key === 'jan' || key === 'ola' || key === 'tomek' ? 'en' : 'es',
    isDeleted: false,
    createdAt: created,
  }));
  const accounts = PEOPLE.map(([key]) => ({ email: `${key}@padelpiwo.test`, password: SEED_PASSWORD, profileId: p(key) }));

  // a match at a wall-clock time in Gdańsk, N days from today
  const days = upcomingDays(1, now)[0];
  const at = (dayOffset: number, hour: number, minute = 0) =>
    addDays(zonedToUtc(days.year, days.month, days.day, hour, minute), dayOffset).toISOString();

  let n = 0;
  const match = (m: Partial<Match> & Pick<Match, 'startsAt' | 'players'>): Match => ({
    id: `m_seed_${++n}`,
    hostId: m.players[0].playerId,
    durationMinutes: 90,
    place: 'Pista 1',
    type: 'competitive',
    levelMin: 1,
    levelMax: 10,
    notes: null,
    status: 'open',
    tournamentId: null,
    result: null,
    createdAt: addDays(new Date(m.startsAt), -3).toISOString(),
    ...m,
  });

  const played = (startsAt: string, keys: string[], sets: SetScore[], type: Match['type'] = 'competitive'): Match => {
    const winnerTeam = winnerOfSets(sets);
    return match({
      startsAt,
      players: players(keys),
      type,
      status: 'played',
      result: {
        submittedBy: p(keys[0]),
        winnerTeam,
        status: 'confirmed',
        confirmedBy: p(keys[2]),
        createdAt: addMinutes(new Date(startsAt), 120).toISOString(),
        sets,
      },
    });
  };

  const s = (...pairs: [number, number][]) => pairs.map(([a, b]) => ({ a, b }));

  const matches: Match[] = [
    // the season so far: confirmed results, oldest first
    played(at(-40, 19), ['eva', 'jan', 'marc', 'diego'], s([6, 4], [6, 3])),
    played(at(-37, 18), ['ana', 'lucia', 'luis', 'kasia'], s([6, 3], [4, 6], [10, 7])),
    played(at(-33, 20), ['marc', 'piotr', 'sara', 'tomek'], s([6, 2], [6, 1])),
    played(at(-30, 19), ['diego', 'eva', 'ana', 'piotr'], s([6, 4], [3, 6], [10, 8])),
    played(at(-26, 18, 30), ['jan', 'sara', 'luis', 'ola'], s([6, 1], [6, 2])),
    played(at(-23, 19), ['ana', 'marc', 'jan', 'kasia'], s([7, 5], [6, 4])),
    played(at(-19, 20), ['eva', 'lucia', 'diego', 'tomek'], s([6, 3], [6, 3])),
    played(at(-16, 19), ['piotr', 'kasia', 'ana', 'sara'], s([4, 6], [6, 7])),
    played(at(-12, 18), ['marc', 'eva', 'jan', 'piotr'], s([6, 4], [4, 6], [10, 6])),
    played(at(-9, 19, 30), ['luis', 'tomek', 'ola', 'lucia'], s([6, 4], [6, 4])),
    played(at(-6, 19), ['ana', 'diego', 'marc', 'luis'], s([6, 2], [6, 4])),
    played(at(-5, 11), ['sara', 'ola', 'kasia', 'tomek'], s([6, 3], [6, 2]), 'friendly'),

    // Ana hosted; her partner sent the result 8 days ago and the rivals never answered:
    // Ana can now confirm it herself (host_confirm_result)
    match({
      startsAt: at(-9, 20),
      players: players(['ana', 'kasia', 'piotr', 'lucia']),
      status: 'full',
      result: { submittedBy: p('kasia'), winnerTeam: 'A', status: 'pending', confirmedBy: null, createdAt: at(-8, 22), sets: s([6, 3], [6, 4]) },
    }),
    // the other team sent a result yesterday: Ana can confirm or dispute
    match({
      startsAt: at(-2, 19),
      players: players(['eva', 'sara', 'ana', 'luis']),
      status: 'full',
      result: { submittedBy: p('eva'), winnerTeam: 'A', status: 'pending', confirmedBy: null, createdAt: at(-1, 21), sets: s([6, 4], [7, 6]) },
    }),
    // finished two hours ago, no result yet: Ana can enter it
    match({ startsAt: addMinutes(now, -210).toISOString(), players: players(['marc', 'ana', 'diego', 'jan']), status: 'full', place: 'Pista 2' }),

    // coming up
    match({ startsAt: at(1, 19), players: players(['ana', 'marc']), levelMin: 3, levelMax: 5.5, notes: 'Después, cerveza en el bar de la residencia.' }),
    match({ startsAt: at(2, 18, 30), players: players(['eva', 'jan', 'diego']), levelMin: 4.8, levelMax: 7, place: 'Pista 2' }),
    match({ startsAt: at(3, 10), players: players(['luis']), type: 'friendly', durationMinutes: 60 }),
    match({ startsAt: at(4, 20), players: players(['sara', 'ana', 'piotr', 'kasia']), status: 'full' }),
    match({ startsAt: at(5, 9, 30), players: players(['tomek', 'ola']), type: 'friendly', levelMin: 2, levelMax: 4.5, place: 'Pista 3' }),
    match({ startsAt: at(2, 21), players: players(['lucia']), status: 'cancelled' }),
  ];

  // ---------------------------------------------------------------- tournaments
  // A tie's match puts pair A in slots 1-2 and pair B in slots 3-4, hosted by the organizer.
  const tieMatch = (id: string, t: { id: string; organizer: string; name: string; place: string }, startsAt: string, a: [string, string], b: [string, string], sets?: SetScore[]): Match => {
    const m = match({ startsAt, players: players([...a, ...b]), status: sets ? 'played' : 'full', place: t.place, tournamentId: t.id, notes: t.name });
    m.id = id;
    m.hostId = p(t.organizer);
    if (sets) {
      m.result = { submittedBy: p(a[0]), winnerTeam: winnerOfSets(sets), status: 'confirmed', confirmedBy: p(b[0]), createdAt: addMinutes(new Date(startsAt), 120).toISOString(), sets };
    }
    return m;
  };
  const pair = (id: string, a: string, b: string, status: TournamentPair['status'], seed: number | null, createdAt: string): TournamentPair => ({
    id,
    player1Id: p(a),
    player2Id: p(b),
    status,
    seed,
    createdAt,
  });
  const tie = (id: string, roundNo: number, pos: number, pairAId: string | null, pairBId: string | null, matchId: string | null, winnerPairId: string | null): TournamentTie => ({
    id,
    roundNo,
    pos,
    pairAId,
    pairBId,
    matchId,
    winnerPairId,
  });

  // finished, with champions
  const beer = { id: 't_seed_beer', organizer: 'eva', name: 'Torneo de la cerveza', place: 'Pista 2' };
  matches.push(
    tieMatch('m_t_beer_s1', beer, at(-21, 17), ['eva', 'luis'], ['jan', 'ola'], s([6, 3], [6, 4])),
    tieMatch('m_t_beer_s2', beer, at(-21, 18, 30), ['marc', 'sara'], ['diego', 'tomek'], s([4, 6], [6, 3], [7, 10])),
    tieMatch('m_t_beer_f', beer, at(-18, 19), ['eva', 'luis'], ['diego', 'tomek'], s([6, 4], [6, 4])),
  );
  // running: Ana organizes it and plays in it; one semifinal is still to be played
  const flash = { id: 't_seed_flash', organizer: 'ana', name: 'Liga relámpago', place: 'Pista 1' };
  matches.push(
    tieMatch('m_t_flash_s1', flash, at(-3, 19), ['ana', 'kasia'], ['tomek', 'ola'], s([6, 2], [6, 3])),
    tieMatch('m_t_flash_s2', flash, at(2, 19), ['sara', 'piotr'], ['lucia', 'luis']),
  );

  const tournaments: Tournament[] = [
    {
      id: 't_seed_autumn',
      organizerId: p('marc'),
      name: 'Copa de otoño',
      description: 'Torneo de la residencia por parejas. Al acabar, cervezas en el bar.',
      place: 'Pista 1',
      startsAt: at(10, 10),
      maxPairs: 4,
      roundDays: 7,
      status: 'registration',
      championPairId: null,
      // 3 of 4 pairs confirmed. Luis named Ana as his partner and she has not answered:
      // if she accepts, the cap fills and the draw runs on its own
      pairs: [
        pair('tp_autumn_1', 'marc', 'diego', 'confirmed', null, at(-3, 12)),
        pair('tp_autumn_2', 'eva', 'jan', 'confirmed', null, at(-2, 18)),
        pair('tp_autumn_4', 'sara', 'piotr', 'confirmed', null, at(-2, 20)),
        pair('tp_autumn_3', 'luis', 'ana', 'pending', null, at(-1, 12)),
      ],
      ties: [],
      createdAt: at(-4, 9),
    },
    {
      id: flash.id,
      organizerId: p('ana'),
      name: flash.name,
      description: 'Dos rondas en una semana.',
      place: flash.place,
      startsAt: at(-4, 18),
      maxPairs: 4,
      roundDays: 4,
      status: 'in_progress',
      championPairId: null,
      pairs: [
        pair('tp_flash_1', 'ana', 'kasia', 'confirmed', 1, at(-8, 10)),
        pair('tp_flash_2', 'tomek', 'ola', 'confirmed', 2, at(-8, 11)),
        pair('tp_flash_3', 'sara', 'piotr', 'confirmed', 3, at(-7, 9)),
        pair('tp_flash_4', 'lucia', 'luis', 'confirmed', 4, at(-6, 20)),
      ],
      ties: [
        tie('tt_flash_1', 1, 1, 'tp_flash_1', 'tp_flash_2', 'm_t_flash_s1', 'tp_flash_1'),
        tie('tt_flash_2', 1, 2, 'tp_flash_3', 'tp_flash_4', 'm_t_flash_s2', null),
        tie('tt_flash_f', 2, 1, 'tp_flash_1', null, null, null),
      ],
      createdAt: at(-9, 9),
    },
    {
      id: beer.id,
      organizerId: p('eva'),
      name: beer.name,
      description: 'Quien pierde la final paga la primera ronda.',
      place: beer.place,
      startsAt: at(-21, 17),
      maxPairs: 4,
      roundDays: 3,
      status: 'finished',
      championPairId: 'tp_beer_1',
      pairs: [
        pair('tp_beer_1', 'eva', 'luis', 'confirmed', 1, at(-30, 10)),
        pair('tp_beer_2', 'jan', 'ola', 'confirmed', 2, at(-30, 12)),
        pair('tp_beer_3', 'marc', 'sara', 'confirmed', 3, at(-29, 9)),
        pair('tp_beer_4', 'diego', 'tomek', 'confirmed', 4, at(-28, 19)),
      ],
      ties: [
        tie('tt_beer_1', 1, 1, 'tp_beer_1', 'tp_beer_2', 'm_t_beer_s1', 'tp_beer_1'),
        tie('tt_beer_2', 1, 2, 'tp_beer_3', 'tp_beer_4', 'm_t_beer_s2', 'tp_beer_4'),
        tie('tt_beer_f', 2, 1, 'tp_beer_1', 'tp_beer_4', 'm_t_beer_f', 'tp_beer_1'),
      ],
      createdAt: at(-31, 9),
    },
  ];

  const notifications: SeedState['notifications'] = [
    { id: 'n_seed_1', playerId: p('ana'), type: 'result_submitted', matchId: 'm_seed_14', tournamentId: null, actorId: p('eva'), readAt: null, createdAt: at(-1, 21) },
    { id: 'n_seed_2', playerId: p('ana'), type: 'result_reminder', matchId: 'm_seed_15', tournamentId: null, actorId: null, readAt: null, createdAt: addMinutes(now, -120).toISOString() },
    { id: 'n_seed_4', playerId: p('ana'), type: 'tournament_pair_invite', matchId: null, tournamentId: 't_seed_autumn', actorId: p('luis'), readAt: null, createdAt: at(-1, 12) },
    { id: 'n_seed_3', playerId: p('ana'), type: 'player_joined', matchId: 'm_seed_16', tournamentId: null, actorId: p('marc'), readAt: at(-1, 10), createdAt: at(-1, 9) },
  ];

  return { profiles, accounts, matches, tournaments, notifications };
}
