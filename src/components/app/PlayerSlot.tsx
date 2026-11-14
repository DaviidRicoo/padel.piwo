import { Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText, Avatar, Badge, LevelChip } from '@/components/ui';
import { useFocusRing } from '@/components/ui/focus';
import { useTheme } from '@/theme';

export interface PlayerSlotProps {
  player?: { name: string; uri?: string | null; level?: number } | null;
  me?: boolean;
  /** asked for a slot outside the level range, waiting for the host */
  requested?: boolean;
  /** "Equipo A", read with the join button */
  teamLabel: string;
  onJoin?: () => void;
  joinLabel?: string;
  meLabel?: string;
  requestedLabel?: string;
}

export function PlayerSlot({
  player,
  me,
  requested,
  teamLabel,
  onJoin,
  joinLabel = 'Unirme',
  meLabel = 'Tú',
  requestedLabel = 'Pendiente',
}: PlayerSlotProps) {
  const t = useTheme();
  const focus = useFocusRing();
  const box = { flex: 1, minHeight: 112, borderRadius: t.radius.lg, padding: t.space[3], alignItems: 'center' as const, justifyContent: 'center' as const, gap: t.space[1] };

  if (!player) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${joinLabel}, ${teamLabel}`}
        accessibilityState={{ disabled: !onJoin }}
        disabled={!onJoin}
        onPress={onJoin}
        {...focus.handlers}
        style={({ pressed }) => [
          box,
          { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.color.borderInput, backgroundColor: pressed ? t.color.surface2 : 'transparent' },
          focus.ring,
        ]}>
        <Plus color={t.color.accentText} size={24} />
        <AppText variant="label" tone="accentText">
          {joinLabel}
        </AppText>
      </Pressable>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={[player.name, me ? meLabel : null, requested ? requestedLabel : null].filter(Boolean).join(', ')}
      style={[box, { backgroundColor: t.color.surface, borderWidth: me ? 1.5 : 0, borderColor: me ? t.color.accent : undefined }]}>
      <Avatar name={player.name} uri={player.uri} size={40} me={me} />
      <AppText variant="label" numberOfLines={1} align="center">
        {me ? meLabel : player.name}
      </AppText>
      {requested ? (
        <View style={{ alignSelf: 'center' }}>
          <Badge label={requestedLabel} tone="warning" />
        </View>
      ) : player.level != null ? (
        <LevelChip value={player.level} size="sm" centered />
      ) : null}
    </View>
  );
}
