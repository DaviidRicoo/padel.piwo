import { Pressable, ScrollView, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { useFocusRing } from './focus';

export interface Chip<T extends string> {
  value: T;
  label: string;
  /** a second, smaller line (the date under "Mañana") */
  sublabel?: string;
  disabled?: boolean;
}

export interface ChipGroupProps<T extends string> {
  /** read before the options, e.g. "Día" */
  accessibilityLabel: string;
  chips: Chip<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** one scrolling row (days) or a wrapping grid (times) */
  layout?: 'scroll' | 'wrap';
}

/** Pick one of many options. A radio group for screen readers. */
export function ChipGroup<T extends string>({ accessibilityLabel, chips, value, onChange, layout = 'wrap' }: ChipGroupProps<T>) {
  const t = useTheme();
  const items = chips.map((c) => <ChipButton key={c.value} chip={c} selected={c.value === value} onPress={() => onChange(c.value)} />);
  if (layout === 'scroll') {
    return (
      <ScrollView
        horizontal
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: t.space[2], paddingHorizontal: t.layout.gutter }}
        style={{ marginHorizontal: -t.layout.gutter }}>
        {items}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
      {items}
    </View>
  );
}

function ChipButton<T extends string>({ chip, selected, onPress }: { chip: Chip<T>; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={chip.sublabel ? `${chip.label}, ${chip.sublabel}` : chip.label}
      accessibilityState={{ checked: selected, disabled: !!chip.disabled }}
      disabled={chip.disabled}
      onPress={onPress}
      {...focus.handlers}
      style={({ pressed }) => [
        {
          minWidth: chip.sublabel ? 64 : 68,
          minHeight: t.layout.touchMin,
          paddingHorizontal: t.space[3],
          paddingVertical: t.space[2],
          borderRadius: t.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: selected ? t.color.accent : t.color.border,
          backgroundColor: selected ? t.color.accent : pressed ? t.color.surface2 : t.color.surface,
          opacity: chip.disabled ? t.opacity.disabled : 1,
        },
        focus.ring,
      ]}>
      <AppText variant="label" tone={selected ? 'onAccent' : 'text'} numeric>
        {chip.label}
      </AppText>
      {chip.sublabel ? (
        <AppText variant="caption" tone={selected ? 'onAccent' : 'textMuted'}>
          {chip.sublabel}
        </AppText>
      ) : null}
    </Pressable>
  );
}
