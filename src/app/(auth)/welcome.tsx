import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

// S01 Welcome: the first screen for someone without a session.
export default function Welcome() {
  const t = useTheme();
  const { t: tr } = useI18n();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
      <View style={{ flex: 1, width: '100%', maxWidth: t.layout.maxContent, alignSelf: 'center', padding: t.layout.gutter, justifyContent: 'center', gap: t.space[6] }}>
        <Image
          source={require('../../../image/logo.jpg')}
          style={{ width: '100%', aspectRatio: 2752 / 1536, borderRadius: t.radius.xl }}
          contentFit="cover"
          accessibilityLabel="Padel & Piwo Gdańsk"
        />
        <AppText variant="title" align="center" accessibilityRole="text">
          {tr('welcome.tagline')}
        </AppText>
        <View style={{ gap: t.space[3] }}>
          <Button label={tr('welcome.signUp')} size="lg" fullWidth onPress={() => router.push('/sign-up')} />
          <Button label={tr('welcome.signIn')} size="lg" variant="secondary" fullWidth onPress={() => router.push('/sign-in')} />
        </View>
      </View>
    </SafeAreaView>
  );
}
