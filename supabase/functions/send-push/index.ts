// send-push: called every minute by pg_cron (migration 20261114000200_schedules.sql)
// when there are unsent notifications. Claims them with claim_pushes() (each one
// exactly once) and hands them to the Expo push service, in each player's language.
// Auth: the x-cron-secret header must equal the PUSH_CRON_SECRET function secret.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { json, secretKey, SUPABASE_URL } from '../_shared/env.ts';

type Locale = 'es' | 'en';

// Push texts, written for Padel & Piwo. They mirror the in-app texts in src/i18n.
const TEXTS: Record<Locale, Record<string, string>> = {
  es: {
    player_joined: '{name} se ha unido a tu partido',
    join_requested: '{name} quiere unirse a tu partido',
    request_accepted: 'Te han aceptado en un partido',
    match_cancelled: 'Se ha cancelado un partido en el que estabas',
    result_submitted: '{name} ha enviado un resultado. Confírmalo o márcalo como incorrecto.',
    result_confirmed: 'Se ha confirmado el resultado de tu partido',
    result_disputed: '{name} dice que el resultado no es correcto',
    result_reminder: 'Tu partido ha terminado. Introduce o confirma el resultado.',
    tournament_pair_invite: '{name} te ha invitado a jugar en pareja en un torneo',
    tournament_pair_accepted: '{name} ha aceptado jugar contigo en el torneo',
    tournament_pair_declined: '{name} no puede jugar contigo en el torneo',
    tournament_pair_withdrawn: '{name} ha retirado vuestra pareja del torneo',
    tournament_started: 'Ya hay sorteo en un torneo en el que juegas',
    tournament_match_ready: 'Tienes partido de torneo: mira la fecha y el rival',
    tournament_cancelled: 'Se ha cancelado un torneo en el que estabas',
    tournament_finished: '¡Habéis ganado el torneo!',
    tournament_organizer_assigned: 'Ahora organizas un torneo',
  },
  en: {
    player_joined: '{name} joined your match',
    join_requested: '{name} wants to join your match',
    request_accepted: 'You were accepted into a match',
    match_cancelled: 'A match you were in was cancelled',
    result_submitted: '{name} sent a result. Confirm it or mark it as wrong.',
    result_confirmed: 'The result of your match was confirmed',
    result_disputed: '{name} says the result is wrong',
    result_reminder: 'Your match has ended. Enter or confirm the result.',
    tournament_pair_invite: '{name} invited you to play as a pair in a tournament',
    tournament_pair_accepted: '{name} agreed to play with you in the tournament',
    tournament_pair_declined: '{name} cannot play with you in the tournament',
    tournament_pair_withdrawn: '{name} withdrew your pair from the tournament',
    tournament_started: 'The draw is out for a tournament you play in',
    tournament_match_ready: 'You have a tournament match: check the date and your rivals',
    tournament_cancelled: 'A tournament you were in was cancelled',
    tournament_finished: 'You won the tournament!',
    tournament_organizer_assigned: 'You now organise a tournament',
  },
};

interface Claimed {
  id: string;
  player_id: string;
  type: string;
  match_id: string | null;
  tournament_id: string | null;
  actor_name: string | null;
  locale: Locale;
  tokens: string[];
}

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

Deno.serve(async (req) => {
  const expected = Deno.env.get('PUSH_CRON_SECRET');
  if (!expected || req.headers.get('x-cron-secret') !== expected) return json({ error: 'forbidden' }, 403);

  const admin = createClient(SUPABASE_URL, secretKey(), { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('claim_pushes', { p_limit: 100 });
  if (error) return json({ error: error.message }, 500);

  const claimed = (data ?? []) as Claimed[];
  const messages = claimed.flatMap((n) => {
    const texts = TEXTS[n.locale] ?? TEXTS.es;
    const body = (texts[n.type] ?? '').replace('{name}', n.actor_name ?? '—');
    // the app opens the match first, else the tournament (src/app/(app)/notifications.tsx)
    const data = { notificationId: n.id, matchId: n.match_id, tournamentId: n.tournament_id };
    return n.tokens.map((to) => ({ to, title: 'Padel & Piwo', body, data, sound: 'default' as const }));
  });

  const stale: string[] = [];
  // Expo accepts up to 100 messages per request
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      // the rows are already claimed; log and move on rather than push twice later
      console.error('expo push failed', res.status, await res.text());
      continue;
    }
    const tickets = ((await res.json()) as { data: ExpoTicket[] }).data ?? [];
    tickets.forEach((ticket, j) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') stale.push(batch[j].to);
    });
  }

  // tokens of uninstalled apps are removed so they are not tried again
  if (stale.length) await admin.from('push_tokens').delete().in('token', stale);

  return json({ claimed: claimed.length, sent: messages.length, removedTokens: stale.length });
});
