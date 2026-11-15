import { useState } from 'react';
import { Platform, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Visible focus for keyboard and switch users: a 2 px ring in the `focus` role,
 * 2 px away from the element. Spread `handlers` on the Pressable and add
 * `ring` to its style. On the web the ring only shows for keyboard focus
 * (:focus-visible), not after a mouse or touch press.
 */
interface KeyEvent {
  key?: string;
  repeat?: boolean;
  nativeEvent?: { key?: string; repeat?: boolean };
  preventDefault?: () => void;
}

/**
 * Web only: Space presses a switch or a radio, as the ARIA patterns expect.
 * react-native-web's Pressable does it for role="button" only (BUG-005); Enter
 * already works for every role. Spread the result on the Pressable.
 */
export function spaceToPress(onPress: (() => void) | undefined, disabled?: boolean): object {
  if (Platform.OS !== 'web' || !onPress) return {};
  return {
    onKeyDown: (e: KeyEvent) => {
      const key = e.key ?? e.nativeEvent?.key;
      if (key !== ' ' && key !== 'Spacebar') return;
      e.preventDefault?.(); // the page must not scroll either way
      if (disabled || e.repeat || e.nativeEvent?.repeat) return;
      onPress();
    },
  };
}

export function useFocusRing() {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const ring: ViewStyle | null = focused
    ? { outlineWidth: 2, outlineStyle: 'solid', outlineColor: t.color.focus, outlineOffset: 2 }
    : null;
  return {
    focused,
    ring,
    handlers: {
      onFocus: (e?: { target?: unknown }) => {
        if (Platform.OS === 'web') {
          const el = e?.target as { matches?: (selector: string) => boolean } | undefined;
          if (el?.matches && !el.matches(':focus-visible')) return;
        }
        setFocused(true);
      },
      onBlur: () => setFocused(false),
    },
  };
}
