import { Image, type ImageSource } from 'expo-image';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useFocusRing } from '@/components/ui/focus';
import { useTheme } from '@/theme';

/** Cut-out player photos (assets/images/players), each one a transparent PNG. */
export const PLAYER_PHOTOS = {
  ball: require('../../assets/images/players/player-ball.png'),
  celebrate: require('../../assets/images/players/player-celebrate.png'),
  ready: require('../../assets/images/players/player-ready.png'),
  swing: require('../../assets/images/players/player-swing.png'),
} satisfies Record<string, ImageSource>;

const HEIGHT = 132;
/** how far the player's head rises above the banner */
const RISE = 36;

/**
 * A brand-navy banner with a player standing on its right edge, head above the
 * top. Always navy, whatever the theme, like the welcome screen. The photo is
 * decoration only: the title and body carry the meaning.
 */
export function PhotoBanner({ title, body, photo, onPress }: { title: string; body: string; photo: ImageSource; onPress?: () => void }) {
  const t = useTheme();
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      disabled={!onPress}
      {...focus.handlers}
      style={({ pressed }) => [
        {
          marginTop: RISE,
          height: HEIGHT,
          borderRadius: t.radius.lg,
          backgroundColor: t.color.brand,
          // always a transform: dropping it after a press crashes React Native on phones (BUG-008)
          transform: [{ scale: pressed && onPress ? t.scale.pressed : 1 }],
        },
        focus.ring,
      ]}>
      <View style={{ flex: 1, justifyContent: 'center', paddingLeft: t.space[4], paddingRight: '44%', gap: t.space[1] }}>
        <AppText variant="title" tone="onBrand" numberOfLines={2}>
          {title}
        </AppText>
        <AppText variant="bodySm" tone="onBrand" style={{ opacity: 0.8 }} numberOfLines={3}>
          {body}
        </AppText>
      </View>
      <Image
        source={photo}
        // decoration: alt="" on the web, hidden from screen readers on phones
        accessible={false}
        accessibilityLabel=""
        contentFit="contain"
        contentPosition="bottom"
        style={{ position: 'absolute', right: t.space[2], bottom: 0, width: '42%', height: HEIGHT + RISE }}
      />
    </Pressable>
  );
}
