import { Minus, Plus } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';

import { useI18n } from '@/i18n';
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

const WEB = Platform.OS === 'web';

/**
 * A number with − and + buttons. On a phone, screen readers get one "adjustable"
 * element (swipe up or down). On the web there is no such gesture, so the two buttons
 * are the controls: each is labelled, and the box is a named group (BUG-002).
 */
export function Stepper({ label, value, onChange, min, max, step = 1, format = String, error }: StepperProps) {
  const t = useTheme();
  const { t: tr } = useI18n();
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));
  return (
    <View
      accessible={!WEB}
      accessibilityRole={WEB ? undefined : 'adjustable'}
      role={WEB ? 'group' : undefined}
      accessibilityLabel={label}
      aria-valuemin={WEB ? undefined : min}
      aria-valuemax={WEB ? undefined : max}
      aria-valuenow={WEB ? undefined : value}
      aria-valuetext={WEB ? undefined : format(value)}
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
      <StepButton icon="minus" label={`${tr('common.decrease')}: ${label}`} disabled={value <= min} onPress={() => set(value - step)} />
      <AppText variant="title" numeric accessibilityRole="none" aria-live={WEB ? 'polite' : undefined}>
        {format(value)}
      </AppText>
      <StepButton icon="plus" label={`${tr('common.increase')}: ${label}`} disabled={value >= max} onPress={() => set(value + step)} />
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: 'minus' | 'plus'; label: string; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  const focus = useFocusRing();
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      // on a phone the parent "adjustable" element is what screen readers use; on the web, these buttons
      accessible={WEB}
      importantForAccessibility={WEB ? undefined : 'no'}
      accessibilityRole={WEB ? 'button' : undefined}
      accessibilityLabel={WEB ? label : undefined}
      aria-disabled={WEB ? disabled : undefined}
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
