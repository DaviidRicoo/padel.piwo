import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AppText, Button, Screen, TextField, useToast } from '@/components/ui';
import { toApiError } from '@/data/errors';
import { useApi } from '@/data/provider';
import { useI18n } from '@/i18n';

// After sign-up (S02): the 6-digit code emailed by Supabase Auth activates the
// account and signs the player in. Codes instead of links work the same in
// Expo Go, the web preview and the installed app.
export default function VerifyEmail() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const api = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null);

  async function verify() {
    setError(undefined);
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t('errors.invalid_code'));
      return;
    }
    setBusy('verify');
    try {
      await api.auth.verifySignUp(email, code);
      router.replace('/');
    } catch (e) {
      setError(t(`errors.${toApiError(e).code}`));
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    setBusy('resend');
    try {
      await api.auth.resendSignUpCode(email);
      toast(t('verify.resent'), 'success');
    } catch (e) {
      toast(t(`errors.${toApiError(e).code}`), 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <AppText>{t('verify.body', { email })}</AppText>
      <TextField
        label={t('verify.code')}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        error={error}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        onSubmitEditing={verify}
      />
      <Button label={t('verify.submit')} size="lg" fullWidth loading={busy === 'verify'} onPress={verify} />
      <Button label={t('verify.resend')} variant="ghost" fullWidth loading={busy === 'resend'} onPress={resend} />
      <AppText variant="caption" tone="textMuted" align="center">
        {t('verify.spam')}
      </AppText>
    </Screen>
  );
}
