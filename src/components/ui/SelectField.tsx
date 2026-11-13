import { ChevronDown } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { useFocusRing } from './focus';
import type { IconType } from './types';

export interface SelectFieldProps {
  label: string;
  value?: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  disabled?: boolean;
  icon?: IconType;
  /** opens the picker (native date and time pickers are added in /replica-build) */
  onPress: () => void;
}

export function SelectField({ label, value, placeholder, helper, error, disabled, icon: Icon, onPress }: SelectFieldProps) {
  const t = useTheme();
  const focus = useFocusRing();
  const borderWidth = error || focus.focused ? 2 : 1;
  return (
    <View style={{ gap: t.space[1], opacity: disabled ? t.opacity.disabled : 1 }}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder ?? ''}`}
        accessibilityHint={error ?? helper}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        {...focus.handlers}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space[2],
          minHeight: t.layout.controlMd,
          paddingHorizontal: t.space[3] - (borderWidth - 1),
          borderRadius: t.radius.md,
          borderWidth,
          borderColor: error ? t.color.danger : focus.focused ? t.color.focus : t.color.borderInput,
          backgroundColor: pressed ? t.color.surface : t.color.bg,
        })}>
        {Icon ? <Icon color={t.color.textMuted} size={18} /> : null}
        <AppText style={{ flex: 1 }} tone={value ? 'text' : 'textMuted'} numberOfLines={1}>
          {value ?? placeholder}
        </AppText>
        <ChevronDown color={t.color.textMuted} size={18} />
      </Pressable>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="textMuted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}
