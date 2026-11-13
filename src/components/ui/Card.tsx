import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { useFocusRing } from './focus';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** required when pressable: one sentence that sums up the card */
  accessibilityLabel?: string;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, onPress, accessibilityLabel, padding, style }: CardProps) {
  const t = useTheme();
  const focus = useFocusRing();
  const base: ViewStyle = {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.color.border,
    padding: padding ?? t.space[4],
    ...t.shadow('card'),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      {...focus.handlers}
      style={({ pressed }) => [base, pressed ? { backgroundColor: t.color.surface2 } : null, focus.ring, style]}>
      {children}
    </Pressable>
  );
}
