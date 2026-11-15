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
  /** a highlighted card (an invitation waiting for an answer): an accent outline */
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A surface on the page background. No border and no shadow: the change of
 * surface is the edge (light: white on a cool grey; dark: navy on deep navy).
 */
export function Card({ children, onPress, accessibilityLabel, padding, highlight, style }: CardProps) {
  const t = useTheme();
  const focus = useFocusRing();
  const base: ViewStyle = {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    padding: padding ?? t.space[4],
    borderWidth: highlight ? 1.5 : 0,
    borderColor: highlight ? t.color.accent : undefined,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      {...focus.handlers}
      style={({ pressed }) => [
        base,
        // the transform is always set: dropping it after a press crashes React Native on phones
        { transform: [{ scale: pressed ? 0.99 : 1 }] },
        pressed ? { backgroundColor: t.color.surface2 } : null,
        focus.ring,
        style,
      ]}>
      {children}
    </Pressable>
  );
}

/**
 * Rows grouped in one rounded surface, split by inset hairlines (settings,
 * lists of players or pairs). Children are rendered in order; falsy ones are skipped.
 */
export function Group({ children, inset = 0 }: { children: ReactNode; inset?: number }) {
  const t = useTheme();
  const rows = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  return (
    <View style={{ backgroundColor: t.color.surface, borderRadius: t.radius.lg, overflow: 'hidden' }}>
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: 1, marginLeft: inset, backgroundColor: t.color.border }} /> : null}
          {row}
        </View>
      ))}
    </View>
  );
}
