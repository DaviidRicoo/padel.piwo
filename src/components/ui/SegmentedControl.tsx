import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { useFocusRing } from './focus';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** what is being chosen, read before the options ("Tipo de partido") */
  accessibilityLabel: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, disabled }: SegmentedControlProps<T>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        padding: t.space[1],
        gap: t.space[1],
        borderRadius: t.radius.pill,
        backgroundColor: t.color.surface,
        borderWidth: 1,
        borderColor: t.color.border,
        opacity: disabled ? t.opacity.disabled : 1,
      }}>
      {options.map((o) => (
        <Segment key={o.value} label={o.label} selected={o.value === value} disabled={disabled} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

function Segment({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  const t = useTheme();
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      {...focus.handlers}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: t.layout.controlSm,
          paddingHorizontal: t.space[3],
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: t.radius.pill,
          backgroundColor: selected ? t.color.accent : pressed ? t.color.surface2 : 'transparent',
        },
        focus.ring,
      ]}>
      {/* up to two lines: with four options a label like "Sin indicar" would otherwise be cut */}
      <AppText variant="label" tone={selected ? 'onAccent' : 'textMuted'} numberOfLines={2} align="center">
        {label}
      </AppText>
    </Pressable>
  );
}
