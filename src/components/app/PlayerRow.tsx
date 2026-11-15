import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText, Avatar, LevelChip } from '@/components/ui';
import { useFocusRing } from '@/components/ui/focus';
import { useTheme } from '@/theme';

/** where a Group of player rows starts its hairlines: row padding + avatar + gap */
export const PLAYER_ROW_INSET = 16 + 40 + 12;

export interface PlayerRowProps {
  name: string;
  uri?: string | null;
  level?: number;
  /** picking a partner: the row behaves as a radio button */
  selectable?: boolean;
  selected?: boolean;
  /** e.g. already registered in this tournament */
  disabled?: boolean;
  disabledLabel?: string;
  onPress?: () => void;
}

export function PlayerRow({ name, uri, level, selectable, selected, disabled, disabledLabel, onPress }: PlayerRowProps) {
  const t = useTheme();
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole={selectable ? 'radio' : 'button'}
      accessibilityLabel={[name, disabled ? disabledLabel : null].filter(Boolean).join(', ')}
      aria-disabled={!!disabled}
      aria-checked={selectable ? !!selected : undefined}
      disabled={disabled}
      onPress={onPress}
      {...focus.handlers}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space[3],
          minHeight: 64,
          paddingHorizontal: t.space[4],
          paddingVertical: t.space[2],
          backgroundColor: selected || pressed ? t.color.surface2 : t.color.surface,
          opacity: disabled ? t.opacity.disabled : 1,
        },
        focus.ring,
      ]}>
      <Avatar name={name} uri={uri} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label" numberOfLines={1}>
          {name}
        </AppText>
        {disabled && disabledLabel ? (
          <AppText variant="caption" tone="textMuted">
            {disabledLabel}
          </AppText>
        ) : level != null ? (
          <LevelChip value={level} size="sm" />
        ) : null}
      </View>
      {selectable ? (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: selected ? 0 : 1.5,
            borderColor: t.color.borderInput,
            backgroundColor: selected ? t.color.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {selected ? <Check color={t.color.onAccent} size={16} strokeWidth={3} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
