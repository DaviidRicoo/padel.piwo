import { router } from 'expo-router';
import { Bell, CheckCheck } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText, Avatar, Button, EmptyState, ErrorState, Group, LoadingCards, Screen } from '@/components/ui';
import { useFocusRing } from '@/components/ui/focus';
import { useApi, useQuery } from '@/data/provider';
import type { AppNotification } from '@/data/types';
import { useAction } from '@/data/useAction';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

// S15 Notifications: who joined, results to confirm, reminders. Each opens its match.
export default function Notifications() {
  const t = useTheme();
  const api = useApi();
  const i18n = useI18n();
  const { t: tr } = i18n;
  const { busy, run } = useAction();

  const q = useQuery('notifications-screen', async () => {
    const items = await api.listNotifications();
    const actors = [...new Set(items.map((n) => n.actorId).filter((x): x is string => !!x))];
    const people = Object.fromEntries((await api.getProfiles(actors)).map((p) => [p.id, p]));
    return { items, people };
  });

  const unread = q.data?.items.filter((n) => !n.readAt).length ?? 0;

  return (
    <Screen flush onRefresh={q.refetch}>
      {q.loading ? (
        <View style={{ paddingHorizontal: t.layout.gutter }}>
          <LoadingCards count={3} />
        </View>
      ) : q.error || !q.data ? (
        <ErrorState onRetry={q.refetch} />
      ) : q.data.items.length === 0 ? (
        <EmptyState icon={Bell} title={tr('notifications.emptyTitle')} body={tr('notifications.emptyBody')} />
      ) : (
        <>
          {unread ? (
            <View style={{ paddingHorizontal: t.layout.gutter }}>
              <Button label={tr('notifications.markRead')} icon={CheckCheck} variant="ghost" size="sm" loading={busy === 'read'} onPress={() => run('read', () => api.markNotificationsRead())} />
            </View>
          ) : null}
          <View style={{ paddingHorizontal: t.layout.gutter }}>
            <Group inset={t.space[4] + 40 + t.space[3]}>
              {q.data.items.map((n) => (
                <Item key={n.id} n={n} actor={n.actorId ? q.data!.people[n.actorId]?.displayName : undefined} actorPhoto={n.actorId ? q.data!.people[n.actorId]?.avatarUrl : null} />
              ))}
            </Group>
          </View>
        </>
      )}
    </Screen>
  );
}

function Item({ n, actor, actorPhoto }: { n: AppNotification; actor?: string; actorPhoto?: string | null }) {
  const t = useTheme();
  const i18n = useI18n();
  const focus = useFocusRing();
  const text = i18n.t(`notifications.${n.type}`, { name: actor ?? '—' });
  const unread = !n.readAt;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text}, ${i18n.formatWhen(n.createdAt)}`}
      disabled={!n.matchId && !n.tournamentId}
      onPress={() => {
        // a match first (a tournament match too); otherwise the tournament
        if (n.matchId) router.push(`/match/${n.matchId}`);
        else if (n.tournamentId) router.push(`/tournament/${n.tournamentId}`);
      }}
      {...focus.handlers}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          gap: t.space[3],
          padding: t.space[4],
          backgroundColor: pressed ? t.color.surface2 : t.color.surface,
        },
        focus.ring,
      ]}>
      {actor ? (
        <Avatar name={actor} uri={actorPhoto} size={40} />
      ) : (
        // the same 40 px column as an avatar, so every line of text starts in one place
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.goldSoft }}>
          <Bell color={t.color.goldText} size={20} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant={unread ? 'label' : 'bodySm'}>{text}</AppText>
        <AppText variant="caption" tone="textMuted">
          {i18n.formatWhen(n.createdAt)}
        </AppText>
      </View>
      {unread ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.color.gold, marginTop: 6 }} /> : null}
    </Pressable>
  );
}
