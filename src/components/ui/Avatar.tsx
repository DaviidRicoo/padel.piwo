import { Image } from 'expo-image';
import { UserX } from 'lucide-react-native';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { initials } from './types';

export type AvatarSize = 24 | 32 | 40 | 56 | 88;

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: AvatarSize;
  /** the signed-in player: a 2 px accent ring */
  me?: boolean;
  /** an anonymised, deleted account */
  deleted?: boolean;
}

export function Avatar({ name, uri, size = 40, me, deleted }: AvatarProps) {
  const t = useTheme();
  const ring = me ? 2 : 0;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring,
        borderColor: t.color.accent,
        padding: ring ? 1 : 0,
      }}>
      <View
        style={{
          flex: 1,
          borderRadius: size,
          overflow: 'hidden',
          backgroundColor: t.color.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {deleted ? (
          <UserX color={t.color.textMuted} size={size * 0.5} />
        ) : uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessible={false} />
        ) : (
          <AppText
            variant={size >= 56 ? 'title' : 'label'}
            accessibilityRole="none"
            style={{ fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.5) }}
            maxFontSizeMultiplier={1}>
            {initials(name)}
          </AppText>
        )}
      </View>
    </View>
  );
}
