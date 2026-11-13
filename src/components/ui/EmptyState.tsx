import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import type { IconType } from './types';

export interface EmptyStateProps {
  icon: IconType;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: t.space[3], paddingVertical: t.space[8], paddingHorizontal: t.space[6] }}>
      <Icon color={t.color.textMuted} size={40} strokeWidth={1.75} />
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="bodySm" tone="textMuted" align="center">
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={{ alignSelf: 'center' }} /> : null}
    </View>
  );
}
