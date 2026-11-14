import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { AppThemeProvider, useTheme } from '@/theme';

// S01 Welcome: the first screen for someone without a session. Always on the
// brand navy, whatever the phone's theme, so the logo (drawn on that navy)
// sits on its own ground with no visible box.
export default function Welcome() {
  return (
    <AppThemeProvider initialMode="dark">
      <WelcomeContent />
    </AppThemeProvider>
  );
}

function WelcomeContent() {
  const t = useTheme();
  const { t: tr } = useI18n();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.brand }}>
      <View style={{ flex: 1, width: '100%', maxWidth: t.layout.maxContent, alignSelf: 'center', padding: t.layout.gutter }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Image
            source={require('../../../image/logo.jpg')}
            style={{ width: '100%', aspectRatio: 2752 / 1536 }}
            contentFit="cover"
            accessibilityLabel="Padel & Piwo Gdańsk"
          />
          <AppText variant="title" tone="onBrand" align="center" accessibilityRole="text" style={{ marginTop: t.space[2], paddingHorizontal: t.space[4] }}>
            {tr('welcome.tagline')}
          </AppText>
        </View>
        <View style={{ gap: t.space[3], paddingBottom: t.space[4] }}>
          <Button label={tr('welcome.signUp')} size="lg" fullWidth onPress={() => router.push('/sign-up')} />
          <Button label={tr('welcome.signIn')} size="lg" variant="secondary" fullWidth onPress={() => router.push('/sign-in')} />
        </View>
      </View>
    </SafeAreaView>
  );
}
