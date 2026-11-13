import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { useTheme } from '@/theme';

// Temporary start screen until /replica-build adds the real screens.
export default function Index() {
  const t = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: t.space[6], padding: t.layout.gutter }}>
        <Image
          source={require('../../image/logo.jpg')}
          style={{ width: '100%', maxWidth: 360, aspectRatio: 2752 / 1536, borderRadius: t.radius.xl }}
          contentFit="cover"
          accessibilityLabel="Padel & Piwo Gdańsk"
        />
        <AppText variant="body" tone="textMuted" align="center">
          Partidos, ranking y torneos de la residencia.
        </AppText>
        <Button label="Ver el sistema de diseño" onPress={() => router.push('/design')} />
      </View>
    </SafeAreaView>
  );
}
