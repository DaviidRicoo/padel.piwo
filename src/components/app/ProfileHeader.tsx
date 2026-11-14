import { View } from 'react-native';

import { AppText, Avatar, LevelChip } from '@/components/ui';
import { useTheme } from '@/theme';

export interface ProfileHeaderProps {
  name: string;
  uri?: string | null;
  deleted?: boolean;
  level: number;
  levelPrefix: string;
  locale: string;
  /** "Gdańsk · Mano: derecha · Lado: drive" */
  subtitle?: string | null;
  /** the three numbers under the name: played, won, win rate */
  stats: { label: string; value: string }[];
  /** names the strip for screen readers ("Estadísticas"), since it has no visible heading */
  statsLabel: string;
}

/** S11 and S13: who the player is, then their numbers in one strip split by hairlines. */
export function ProfileHeader({ name, uri, deleted, level, levelPrefix, locale, subtitle, stats, statsLabel }: ProfileHeaderProps) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space[5] }}>
      <View style={{ alignItems: 'center', gap: t.space[2] }}>
        <Avatar name={name} uri={uri} size={88} deleted={deleted} />
        <AppText variant="display" align="center" style={{ fontSize: 26, lineHeight: 32, marginTop: t.space[1] }}>
          {name}
        </AppText>
        <LevelChip value={level} locale={locale} prefix={levelPrefix} centered />
        {subtitle ? (
          <AppText variant="bodySm" tone="textMuted" align="center">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View
        accessibilityRole="summary"
        accessibilityLabel={statsLabel}
        style={{ flexDirection: 'row', backgroundColor: t.color.surface, borderRadius: t.radius.lg, paddingVertical: t.space[4] }}>
        {stats.map((n, i) => (
          <View
            key={n.label}
            accessible
            accessibilityLabel={`${n.label}: ${n.value}`}
            style={{ flex: 1, alignItems: 'center', gap: 2, borderLeftWidth: i ? 1 : 0, borderLeftColor: t.color.border }}>
            <AppText variant="title" numeric accessibilityRole="none" style={{ fontSize: 24, lineHeight: 30 }}>
              {n.value}
            </AppText>
            <AppText variant="caption" tone="textMuted">
              {n.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
