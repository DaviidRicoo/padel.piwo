import { Stack } from 'expo-router';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export const unstable_settings = { initialRouteName: 'welcome' };

export default function AuthLayout() {
  const t = useTheme();
  const { t: tr } = useI18n();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.color.bg },
        headerShadowVisible: false,
        headerTintColor: t.color.accentText,
        headerTitleStyle: { fontFamily: t.type.heading.fontFamily, color: t.color.text },
        contentStyle: { backgroundColor: t.color.bg },
      }}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ title: tr('signUp.title') }} />
      <Stack.Screen name="sign-in" options={{ title: tr('signIn.title') }} />
      <Stack.Screen name="forgot-password" options={{ title: tr('forgot.title') }} />
      <Stack.Screen name="verify-email" options={{ title: tr('verify.title') }} />
    </Stack>
  );
}
