import { useState } from 'react';
import type { ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Visible focus for keyboard and switch users: a 2 px ring in the `focus` role,
 * 2 px away from the element. Spread `handlers` on the Pressable and add
 * `ring` to its style.
 */
export function useFocusRing() {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const ring: ViewStyle | null = focused
    ? { outlineWidth: 2, outlineStyle: 'solid', outlineColor: t.color.focus, outlineOffset: 2 }
    : null;
  return {
    focused,
    ring,
    handlers: { onFocus: () => setFocused(true), onBlur: () => setFocused(false) },
  };
}
