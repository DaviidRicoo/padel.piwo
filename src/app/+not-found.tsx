import { Redirect, router } from 'expo-router';
import { MapPinOff } from 'lucide-react-native';

import { EmptyState, Screen } from '@/components/ui';
import { useUserId } from '@/data/provider';
import { useI18n } from '@/i18n';

// Any address that matches no screen. Without a session (signed out, or the
// session expired on a screen that no longer exists for a guest) it sends the
// person to the welcome screen; with one, it offers a way back.
export default function NotFound() {
  const userId = useUserId();
  const { t } = useI18n();
  if (!userId) return <Redirect href="/welcome" />;
  return (
    <Screen>
      <EmptyState icon={MapPinOff} title={t('notFound.title')} actionLabel={t('notFound.action')} onAction={() => router.replace('/')} />
    </Screen>
  );
}
