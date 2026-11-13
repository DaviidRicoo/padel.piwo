import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, type DimensionValue } from 'react-native';

import { useTheme } from '@/theme';

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

export interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
}

/** Loading placeholder. Hidden from screen readers; the screen announces "Cargando". */
export function Skeleton({ width = '100%', height, radius }: SkeletonProps) {
  const t = useTheme();
  const reduce = useReduceMotion();
  // created once; useState keeps it stable without reading a ref during render
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduce) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: t.motion.slow * 2, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: t.motion.slow * 2, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, pulse, t.motion.slow]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: radius ?? t.radius.sm, backgroundColor: t.color.surface2, opacity: pulse }}
    />
  );
}
