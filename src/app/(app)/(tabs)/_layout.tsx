import { router, Tabs } from 'expo-router';
import { Bell, CalendarDays, CircleUser, History, Medal, Search, Trophy } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFocusRing } from '@/components/ui/focus';
import { useApi, useQuery } from '@/data/provider';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

// The five tabs: Partidos (S05), Recientes (S09), Ranking (S10), Torneos (S17), Perfil (S11).
export default function TabLayout() {
  const t = useTheme();
  const { t: tr } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        // a large title on the page's own background, no band of another colour
        headerStyle: { backgroundColor: t.color.bg, height: 64 + insets.top },
        headerTitleStyle: {
          fontFamily: t.type.display.fontFamily,
          fontSize: 28,
          lineHeight: 34,
          letterSpacing: t.type.display.letterSpacing,
          color: t.color.text,
        },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        tabBarActiveTintColor: t.color.accentText,
        tabBarInactiveTintColor: t.color.textMuted,
        // the default height clips our label font; use the token plus the phone's bottom inset
        tabBarStyle: {
          backgroundColor: t.color.surface,
          borderTopColor: t.color.border,
          borderTopWidth: 1,
          height: t.layout.tabBar + insets.bottom,
          paddingTop: t.space[1],
          paddingBottom: insets.bottom + t.space[1],
        },
        tabBarLabelStyle: { fontFamily: t.type.caption.fontFamily, fontSize: t.type.caption.fontSize, lineHeight: t.type.caption.lineHeight },
        sceneStyle: { backgroundColor: t.color.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: tr('tabs.matches'),
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
          headerRight: () => <HomeHeaderActions />,
        }}
      />
      <Tabs.Screen name="recent" options={{ title: tr('tabs.recent'), tabBarIcon: ({ color, size }) => <History color={color} size={size} /> }} />
      <Tabs.Screen name="ranking" options={{ title: tr('tabs.ranking'), tabBarIcon: ({ color, size }) => <Medal color={color} size={size} /> }} />
      <Tabs.Screen name="tournaments" options={{ title: tr('tabs.tournaments'), tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: tr('tabs.profile'), tabBarIcon: ({ color, size }) => <CircleUser color={color} size={size} /> }} />
    </Tabs>
  );
}

function HomeHeaderActions() {
  const t = useTheme();
  const api = useApi();
  const { t: tr } = useI18n();
  const { data } = useQuery('notifications', () => api.listNotifications());
  const unread = data?.filter((n) => !n.readAt).length ?? 0;
  return (
    <View style={{ flexDirection: 'row', gap: t.space[1], marginRight: t.space[2] }}>
      <HeaderIcon label={tr('matches.search')} onPress={() => router.push('/search')}>
        <Search color={t.color.text} size={22} />
      </HeaderIcon>
      <HeaderIcon label={unread ? tr('matches.notificationsUnread', { n: unread }) : tr('matches.notifications')} onPress={() => router.push('/notifications')}>
        <Bell color={t.color.text} size={22} />
        {unread ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: t.color.gold,
              borderWidth: 2,
              borderColor: t.color.bg,
            }}
          />
        ) : null}
      </HeaderIcon>
    </View>
  );
}

function HeaderIcon({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  const t = useTheme();
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      {...focus.handlers}
      style={({ pressed }) => [
        { width: t.layout.touchMin, height: t.layout.touchMin, alignItems: 'center', justifyContent: 'center', borderRadius: t.radius.pill, backgroundColor: pressed ? t.color.surface2 : 'transparent' },
        focus.ring,
      ]}>
      {children}
    </Pressable>
  );
}
