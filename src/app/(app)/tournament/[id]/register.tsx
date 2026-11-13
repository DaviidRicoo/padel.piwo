import { router, useLocalSearchParams } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PlayerRow } from '@/components/app';
import { AppText, Button, EmptyState, ErrorState, LoadingCards, Screen, TextField } from '@/components/ui';
import { useApi, useQuery } from '@/data/provider';
import { livePairOf } from '@/data/rules';
import { useAction } from '@/data/useAction';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

// S20 Register a pair: pick the partner from the list (names are not unique, so never typed free text).
export default function RegisterPair() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const api = useApi();
  const { t: tr } = useI18n();
  const { busy, run } = useAction();
  const [text, setText] = useState('');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const query = text.trim();

  const q = useQuery(`register-${id}-${query}`, async () => {
    const [tour, players] = await Promise.all([api.getTournament(id), api.searchPlayers(query)]);
    return { tour, players };
  });

  const partner = q.data?.players.find((p) => p.id === partnerId);

  async function submit() {
    setTried(true);
    if (!partnerId) return;
    const name = partner?.displayName ?? '';
    const ok = await run('register', () => api.registerPair(id, partnerId), tr('register.sent', { name }));
    if (ok) router.back();
  }

  return (
    <Screen flush footer={<Button label={tr('register.submit')} size="lg" fullWidth loading={busy === 'register'} onPress={submit} />}>
      <View style={{ paddingHorizontal: t.layout.gutter, gap: t.space[3] }}>
        <AppText tone="textMuted">{tr('register.help')}</AppText>
        <TextField label={tr('register.search')} variant="search" value={text} onChangeText={setText} placeholder={tr('search.placeholder')} autoCorrect={false} />
        {tried && !partnerId ? (
          <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {tr('register.pick')}
          </AppText>
        ) : null}
      </View>
      {q.loading ? (
        <View style={{ paddingHorizontal: t.layout.gutter }}>
          <LoadingCards count={3} />
        </View>
      ) : q.error || !q.data ? (
        <ErrorState onRetry={q.refetch} />
      ) : q.data.players.length === 0 ? (
        <EmptyState icon={SearchX} title={tr('search.emptyTitle')} body={tr('search.emptyBody')} />
      ) : (
        <View accessibilityRole="radiogroup" accessibilityLabel={tr('register.search')} style={{ borderTopWidth: 1, borderColor: t.color.border }}>
          {q.data.players.map((p) => {
            const taken = !!livePairOf(q.data!.tour, p.id);
            return (
              <View key={p.id} style={{ borderBottomWidth: 1, borderColor: t.color.border }}>
                <PlayerRow
                  name={p.displayName}
                  uri={p.avatarUrl}
                  level={p.level}
                  selectable
                  selected={partnerId === p.id}
                  disabled={taken}
                  disabledLabel={tr('register.unavailable')}
                  onPress={() => setPartnerId(p.id)}
                />
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
