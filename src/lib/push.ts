// Push notifications through Expo's push service (the send-push Edge Function
// sends them). The permission is asked after the player's first match, not at
// launch (replica/architecture.md, "push"), and refreshed silently afterwards.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { Api } from '@/data/api';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** The EAS project id, required by Expo for push tokens; set once the EAS project exists. */
function projectId(): string | undefined {
  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromConfig ?? Constants.easConfig?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
}

/**
 * Registers this phone for pushes. `ask` shows the system prompt when the player
 * has not answered it yet; without it, only an earlier "yes" is used.
 * Never throws: pushes are a bonus, the in-app list (S15) always has everything.
 */
export async function registerForPush(api: Api, { ask }: { ask: boolean }): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice || !projectId()) return;
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && ask) status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Padel & Piwo', importance: AndroidImportance.DEFAULT });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await api.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
  } catch (e) {
    // Expo Go cannot receive remote pushes on Android; development and store builds can
    console.warn('push registration skipped', e);
  }
}

/** While signed in: refresh the token if pushes were already allowed, and open the match or tournament a push is about. */
export function usePushNotifications(api: Api, signedIn: boolean) {
  useEffect(() => {
    if (!signedIn || Platform.OS === 'web') return;
    registerForPush(api, { ask: false });
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { matchId?: string | null; tournamentId?: string | null };
      if (data?.matchId) router.push(`/match/${data.matchId}`);
      else if (data?.tournamentId) router.push(`/tournament/${data.tournamentId}`);
    });
    return () => sub.remove();
  }, [api, signedIn]);
}
