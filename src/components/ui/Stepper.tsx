import { Minus, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { useFocusRing } from './focus';

export interface StepperProps {
  /** read by screen readers, e.g. "Set 1, Equipo A" or "Nivel mínimo" */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** how the value is shown and spoken, e.g. 4,5 */
  format?: (value: number) => string;
  error?: boolean;
}

/** A number with − and + buttons. Screen readers get one "adjustable" element. */
export function Stepper({ label, value, onChange, min, max, step = 1, format = String, error }: StepperProps) {
  const t = useTheme();
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: t.radius.md,
        borderWidth: error ? 2 : 1,
        borderColor: error ? t.color.danger : t.color.borderInput,
        backgroundColor: t.color.bg,
        padding: 2,
      }}>
      <StepButton icon="minus" disabled={value <= min} onPress={() => set(value - step)} />
      <AppText variant="title" numeric accessibilityRole="none">
        {format(value)}
      </AppText>
      <StepButton icon="plus" disabled={value >= max} onPress={() => set(value + step)} />
    </View>
  );
}

function StepButton({ icon, disabled, onPress }: { icon: 'minus' | 'plus'; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  const focus = useFocusRing();
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      // the parent "adjustable" element is what screen readers use
      accessible={false}
      importantForAccessibility="no"
      disabled={disabled}
      onPress={onPress}
      {...focus.handlers}
      style={({ pressed }) => [
        {
          width: t.layout.touchMin,
          height: t.layout.touchMin,
          borderRadius: t.radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? t.color.surface2 : 'transparent',
          opacity: disabled ? t.opacity.disabled : 1,
        },
        focus.ring,
      ]}>
      <Icon color={t.color.accentText} size={20} strokeWidth={2.5} />
    </Pressable>
  );
}
