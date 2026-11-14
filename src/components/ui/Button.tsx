import { ActivityIndicator, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type ColorRole } from '@/theme';

import { AppText } from './AppText';
import { useFocusRing } from './focus';
import type { IconType } from './types';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconType;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

// background, text and border role for each variant; every fg/bg pair is in tokens.json "pairs"
const VARIANTS: Record<ButtonVariant, { bg: ColorRole | null; fg: ColorRole; border: ColorRole | null }> = {
  primary: { bg: 'accent', fg: 'onAccent', border: null },
  secondary: { bg: 'surface', fg: 'text', border: 'border' },
  ghost: { bg: null, fg: 'accentText', border: null },
  danger: { bg: 'danger', fg: 'onDanger', border: null },
  gold: { bg: 'gold', fg: 'onGold', border: null },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon: Icon,
  fullWidth,
  style,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const focus = useFocusRing();
  const v = VARIANTS[variant];
  const height = { sm: t.layout.controlSm, md: t.layout.controlMd, lg: t.layout.controlLg }[size];
  const fg = t.color[v.fg];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      hitSlop={size === 'sm' ? (t.layout.touchMin - height) / 2 : undefined}
      {...focus.handlers}
      {...rest}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: size === 'sm' ? t.space[4] : t.space[6],
          // the pill is the action shape; cards and fields keep the rounded rectangle
          borderRadius: t.radius.pill,
          transform: pressed && !inactive ? [{ scale: t.scale.pressed }] : undefined,
          backgroundColor: v.bg ? t.color[v.bg] : 'transparent',
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border ? t.color[v.border] : undefined,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.space[2],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? t.opacity.disabled : pressed ? t.opacity.pressed : 1,
        },
        focus.ring,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" accessibilityElementsHidden />
      ) : Icon ? (
        <Icon color={fg} size={size === 'sm' ? 16 : 20} strokeWidth={2.25} />
      ) : null}
      <View>
        <AppText variant="label" style={{ color: fg }} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
