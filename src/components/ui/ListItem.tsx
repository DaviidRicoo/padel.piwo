import { ChevronRight } from 'lucide-react-native';
import { Platform, Pressable, Switch, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { useFocusRing } from './focus';
import type { IconType } from './types';

type Trailing = { kind: 'chevron' } | { kind: 'value'; text: string } | { kind: 'switch'; value: boolean } | { kind: 'none' };

export interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: IconType;
  trailing?: Trailing;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** for a switch row, called with the new value */
  onPress?: () => void;
}

export function ListItem({ title, subtitle, icon: Icon, trailing = { kind: 'chevron' }, tone = 'default', disabled, onPress }: ListItemProps) {
  const t = useTheme();
  const focus = useFocusRing();
  const isSwitch = trailing.kind === 'switch';
  const fg = tone === 'danger' ? 'danger' : 'text';
  return (
    <Pressable
      accessibilityRole={isSwitch ? 'switch' : 'button'}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityState={{ disabled: !!disabled, checked: isSwitch ? trailing.value : undefined }}
      disabled={disabled}
      onPress={onPress}
      {...focus.handlers}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space[3],
          minHeight: 56,
          paddingHorizontal: t.space[4],
          paddingVertical: t.space[2],
          backgroundColor: pressed ? t.color.surface2 : t.color.surface,
          opacity: disabled ? t.opacity.disabled : 1,
        },
        focus.ring,
      ]}>
      {Icon ? <Icon color={t.color[fg]} size={20} /> : null}
      <View style={{ flex: 1 }}>
        <AppText tone={fg}>{title}</AppText>
        {subtitle ? (
          <AppText variant="bodySm" tone="textMuted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing.kind === 'chevron' ? <ChevronRight color={t.color.textMuted} size={20} /> : null}
      {trailing.kind === 'value' ? (
        <AppText variant="bodySm" tone="textMuted">
          {trailing.text}
        </AppText>
      ) : null}
      {trailing.kind === 'switch' ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
          <Switch
            value={trailing.value}
            trackColor={{ true: t.color.accent, false: t.color.borderInput }}
            thumbColor={t.color.bg}
            ios_backgroundColor={t.color.borderInput}
            // react-native-web ignores thumbColor when on and paints its own teal
            {...(Platform.OS === 'web' ? ({ activeThumbColor: t.color.bg } as object) : {})}
          />
        </View>
      ) : null}
    </Pressable>
  );
}
