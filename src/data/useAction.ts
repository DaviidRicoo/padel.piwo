import { useState } from 'react';

import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';

import { toApiError, type ApiError } from './errors';

/**
 * Runs a change (join, submit a result...) with a busy flag, and turns a
 * failure into a translated error toast. Returns true when it worked.
 */
export function useAction() {
  const toast = useToast();
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(name: string, action: () => Promise<unknown>, success?: string): Promise<boolean> {
    setBusy(name);
    try {
      await action();
      if (success) toast(success, 'success');
      return true;
    } catch (e) {
      const err: ApiError = toApiError(e);
      toast(t(`errors.${err.code}`), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  }

  return { busy, run };
}
