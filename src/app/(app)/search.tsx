import { router } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PlayerRow } from '@/components/app';
import { EmptyState, ErrorState, LoadingCards, Screen, TextField } from '@/components/ui';
import { useApi, useQuery } from '@/data/provider';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

// S16 Search players by name; each result opens their profile (S13).
export default function SearchPlayers() {
  const t = useTheme();
  const api = useApi();
  const { t: tr } = useI18n();
  const [text, setText] = useState('');
  const query = text.trim();
  const q = useQuery(`search-${query}`, () => api.searchPlayers(query));

  return (
    <Screen flush>
      <View style={{ paddingHorizontal: t.layout.gutter }}>
        <TextField label={tr('search.label')} variant="search" value={text} onChangeText={setText} placeholder={tr('search.placeholder')} autoFocus autoCorrect={false} />
      </View>
      {q.loading ? (
        <View style={{ paddingHorizontal: t.layout.gutter }}>
          <LoadingCards count={3} />
        </View>
      ) : q.error ? (
        <ErrorState onRetry={q.refetch} />
      ) : !q.data?.length ? (
        <EmptyState icon={SearchX} title={tr('search.emptyTitle')} body={tr('search.emptyBody')} />
      ) : (
        <View style={{ borderTopWidth: 1, borderColor: t.color.border }} accessibilityLiveRegion="polite">
          {q.data.map((p) => (
            <View key={p.id} style={{ borderBottomWidth: 1, borderColor: t.color.border }}>
              <PlayerRow name={p.displayName} uri={p.avatarUrl} level={p.level} onPress={() => router.push(`/player/${p.id}`)} />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
