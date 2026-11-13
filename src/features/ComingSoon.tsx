import { Hammer } from 'lucide-react-native';

import { EmptyState, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';

/** Placeholder for a screen from the recon inventory that is not built yet. */
export function ComingSoon({ screenId }: { screenId: string }) {
  const { t } = useI18n();
  return (
    <Screen>
      <EmptyState icon={Hammer} title={t('common.comingSoonTitle')} body={`${t('common.comingSoonBody')} (${screenId})`} />
    </Screen>
  );
}
