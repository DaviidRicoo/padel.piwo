import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type ColorRole } from '@/theme';

import { AppText } from './AppText';

export type ToastTone = 'info' | 'success' | 'error';

interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

const TONES: Record<ToastTone, { bg: ColorRole; fg: ColorRole }> = {
  info: { bg: 'accent', fg: 'onAccent' },
  success: { bg: 'success', fg: 'onSuccess' },
  error: { bg: 'danger', fg: 'onDanger' },
};

const ToastContext = createContext<((text: string, tone?: ToastTone) => void) | null>(null);

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}

/**
 * Shows one short message at a time, under the header, for 3 seconds. It sits
 * at the top so it never covers a screen's main action in the footer, and it
 * lets touches through (it has no actions of its own).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<ToastMessage | null>(null);
  // created once; useState keeps it stable without reading a ref during render
  const [opacity] = useState(() => new Animated.Value(0));
  const counter = useRef(0);

  const show = useCallback((text: string, tone: ToastTone = 'info') => {
    counter.current += 1;
    setMessage({ id: counter.current, text, tone });
    AccessibilityInfo.announceForAccessibility(text);
  }, []);

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: t.motion.base, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: t.motion.base, useNativeDriver: true }).start(() =>
        setMessage((m) => (m?.id === message.id ? null : m)),
      );
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, opacity, t.motion.base]);

  const tone = message ? TONES[message.tone] : TONES.info;
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: insets.top + t.layout.header + t.space[2], alignItems: 'center' }}>
          <Animated.View
            pointerEvents="none"
            accessibilityLiveRegion="polite"
            style={{
              opacity,
              maxWidth: t.layout.maxContent - 2 * t.layout.gutter,
              marginHorizontal: t.layout.gutter,
              paddingHorizontal: t.space[4],
              paddingVertical: t.space[3],
              borderRadius: t.radius.md,
              backgroundColor: t.color[tone.bg],
              ...t.shadow('pop'),
            }}>
            <AppText variant="bodySm" tone={tone.fg}>
              {message.text}
            </AppText>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}
