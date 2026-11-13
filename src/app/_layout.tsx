import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';

import { ToastProvider } from '@/components/ui';
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
      <ThemedNavigation />
    </AppThemeProvider>
  );
}

/** Feeds our tokens into the navigation theme, so headers and screen backgrounds follow light and dark. */
function ThemedNavigation() {
  const t = useTheme();
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
      <ToastProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.color.surface },
            headerTintColor: t.color.accentText,
            headerTitleStyle: { fontFamily: t.type.heading.fontFamily, color: t.color.text },
            contentStyle: { backgroundColor: t.color.bg },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="design" options={{ title: 'Sistema de diseño' }} />
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}
