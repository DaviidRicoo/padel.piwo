import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTheme } from '@/theme';

/** A heading inside a screen, with an optional action on the right. */
export function SectionTitle({ children, action, inset }: { children: string; action?: ReactNode; inset?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, paddingHorizontal: inset ? t.layout.gutter : 0, marginTop: t.space[3] }}>
      <AppText variant="title">{children}</AppText>
      {action}
    </View>
  );
}
