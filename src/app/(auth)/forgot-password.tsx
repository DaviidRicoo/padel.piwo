import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';

import { AppText, Button, EmptyState, Screen, TextField } from '@/components/ui';
import { toApiError } from '@/data/errors';
import { useApi } from '@/data/provider';
import { useI18n } from '@/i18n';

// Password reset request, reached from S03. Never says whether an account exists.
export default function ForgotPassword() {
  const api = useApi();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      await api.auth.requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(t(`errors.${toApiError(e).code}`));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Screen>
        <EmptyState icon={MailCheck} title={t('forgot.title')} body={t('forgot.sent')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText tone="textMuted">{t('forgot.body')}</AppText>
      <TextField
        label={t('signUp.email')}
        value={email}
        onChangeText={setEmail}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        onSubmitEditing={submit}
      />
      <Button label={t('forgot.submit')} size="lg" fullWidth loading={busy} onPress={submit} />
    </Screen>
  );
}
