import { Minus, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useFocusRing } from '@/components/ui/focus';
import { useTheme } from '@/theme';

const MIN = 0;
const MAX = 20;

export interface SetScoreRowProps {
  /** "Set 1" */
  setLabel: string;
  a: number;
  b: number;
  onChange: (a: number, b: number) => void;
  teamALabel: string;
  teamBLabel: string;
  /** e.g. "Un set no puede acabar en empate" */
  error?: string;
}

export function SetScoreRow({ setLabel, a, b, onChange, teamALabel, teamBLabel, error }: SetScoreRowProps) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space[2] }}>
      <AppText variant="label" tone="textMuted">
        {setLabel}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
        <Stepper label={`${setLabel}, ${teamALabel}`} value={a} onChange={(v) => onChange(v, b)} error={!!error} />
        <AppText variant="title" tone="textMuted">
          –
        </AppText>
        <Stepper label={`${setLabel}, ${teamBLabel}`} value={b} onChange={(v) => onChange(a, v)} error={!!error} />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function Stepper({ label, value, onChange, error }: { label: string; value: number; onChange: (v: number) => void; error: boolean }) {
  const t = useTheme();
  const set = (v: number) => onChange(Math.min(MAX, Math.max(MIN, v)));
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: MIN, max: MAX, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
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
      <StepButton icon="minus" disabled={value <= MIN} onPress={() => set(value - 1)} />
      <AppText variant="title" numeric accessibilityRole="none">
        {value}
      </AppText>
      <StepButton icon="plus" disabled={value >= MAX} onPress={() => set(value + 1)} />
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
