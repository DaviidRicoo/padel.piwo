import { CloudOff } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

export interface ScreenProps {
  children: ReactNode;
  /** pull to refresh */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** content without side padding (lists that run edge to edge) */
  flush?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** sticky area under the scroll, e.g. the main action */
  footer?: ReactNode;
}

/** A scrolling screen, centred and capped at max-content width on tablets and desktop. */
export function Screen({ children, onRefresh, refreshing = false, flush, contentStyle, footer }: ScreenProps) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.color.accentText} /> : undefined}
        contentContainerStyle={{ paddingVertical: t.space[4], paddingBottom: t.space[12] }}>
        <View
          style={[
            { width: '100%', maxWidth: t.layout.maxContent, alignSelf: 'center', gap: t.space[4], paddingHorizontal: flush ? 0 : t.layout.gutter },
            contentStyle,
          ]}>
          {children}
        </View>
      </ScrollView>
      {footer ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: t.color.border,
            backgroundColor: t.color.surface,
            paddingHorizontal: t.layout.gutter,
            paddingVertical: t.space[3],
          }}>
          <View style={{ width: '100%', maxWidth: t.layout.maxContent, alignSelf: 'center' }}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

/** Placeholder cards while a list loads. */
export function LoadingCards({ count = 3 }: { count?: number }) {
  const t = useTheme();
  const { t: tr } = useI18n();
  return (
    <View accessible accessibilityLabel={tr('common.loading')} style={{ gap: t.space[3] }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ gap: t.space[2], padding: t.space[4], borderRadius: t.radius.lg, backgroundColor: t.color.surface }}>
          <Skeleton height={20} width="55%" />
          <Skeleton height={14} width="35%" />
          <Skeleton height={32} width="70%" />
        </View>
      ))}
    </View>
  );
}

/** A load that failed, with a retry. */
export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  const { t } = useI18n();
  return <EmptyState icon={CloudOff} title={t('common.errorTitle')} body={message ?? t('common.errorBody')} actionLabel={t('common.retry')} onAction={onRetry} />;
}
