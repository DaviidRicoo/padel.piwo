import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';

import { ToastProvider } from '@/components/ui';
import { ApiProvider, useUserId } from '@/data/provider';
import { I18nProvider } from '@/i18n';
import { AppThemeProvider, useTheme } from '@/theme';
import { fontAssets } from '@/theme/fonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AppThemeProvider>
      <I18nProvider>
        <ApiProvider>
          <ThemedNavigation />
        </ApiProvider>
      </I18nProvider>
    </AppThemeProvider>
  );
}

/** Feeds our tokens into the navigation theme, and shows the app or the sign-in screens. */
function ThemedNavigation() {
  const t = useTheme();
  const userId = useUserId();
  const navTheme = useMemo(() => {
    const base = t.name === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.color.accentText,
        background: t.color.bg,
        card: t.color.surface,
        text: t.color.text,
        border: t.color.border,
        notification: t.color.gold,
      },
    };
  }, [t]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={t.name === 'dark' ? 'light' : 'dark'} />
      <ToastProvider bottomOffset={t.layout.tabBar}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.color.bg } }}>
          <Stack.Protected guard={!!userId}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={!userId}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}
