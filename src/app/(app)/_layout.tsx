import { Stack } from 'expo-router';

import { useApi, useUserId } from '@/data/provider';
import { useI18n } from '@/i18n';
import { usePushNotifications } from '@/lib/push';
import { useTheme } from '@/theme';

// Every screen for a signed-in player. The tabs are one entry; the rest open on top of them.
export default function AppLayout() {
  const t = useTheme();
  const { t: tr } = useI18n();
  const api = useApi();
  const userId = useUserId();
  usePushNotifications(api, !!userId);
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.color.surface },
        headerTintColor: t.color.accentText,
        headerTitleStyle: { fontFamily: t.type.heading.fontFamily, color: t.color.text },
        contentStyle: { backgroundColor: t.color.bg },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="match/new" options={{ title: tr('newMatch.title') }} />
      <Stack.Screen name="match/[id]/index" options={{ title: tr('matchDetail.title') }} />
      <Stack.Screen name="match/[id]/result" options={{ title: tr('result.title'), presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ title: tr('notifications.title') }} />
      <Stack.Screen name="settings" options={{ title: tr('settings.title') }} />
      <Stack.Screen name="search" options={{ title: tr('screens.S16') }} />
      <Stack.Screen name="onboarding-level" options={{ title: tr('screens.S04') }} />
      <Stack.Screen name="profile-edit" options={{ title: tr('screens.S12') }} />
      <Stack.Screen name="player/[id]" options={{ title: tr('screens.S13') }} />
      <Stack.Screen name="tournament/new" options={{ title: tr('screens.S18') }} />
      <Stack.Screen name="tournament/[id]/index" options={{ title: tr('screens.S19') }} />
      <Stack.Screen name="tournament/[id]/register" options={{ title: tr('screens.S20') }} />
      <Stack.Screen name="tournament/[id]/bracket" options={{ title: tr('screens.S21') }} />
      <Stack.Screen name="design" options={{ title: tr('settings.designSystem') }} />
    </Stack>
  );
}
