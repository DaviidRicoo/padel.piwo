import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** red confirm button, for leaving, cancelling or deleting */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ visible, title, body, confirmLabel, cancelLabel, destructive, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.space[6] }}>
        {/* the scrim closes the dialog, but is not a separate stop for screen readers */}
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={onCancel}
          style={[StyleSheet.absoluteFill, { backgroundColor: t.alpha('scrim', t.opacity.scrim) }]}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 400,
            gap: t.space[3],
            padding: t.space[6],
            borderRadius: t.radius.xl,
            backgroundColor: t.color.surface,
            ...t.shadow('pop'),
          }}>
          <AppText variant="title">{title}</AppText>
          {body ? <AppText tone="textMuted">{body}</AppText> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: t.space[2], marginTop: t.space[2] }}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} disabled={loading} />
            <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} loading={loading} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
