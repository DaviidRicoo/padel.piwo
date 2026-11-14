import { router } from 'expo-router';
import { useState } from 'react';

import { AppText, Button, Screen, TextField, useToast } from '@/components/ui';
import { toApiError } from '@/data/errors';
import { useApi } from '@/data/provider';
import { useI18n } from '@/i18n';

// Password reset, reached from S03, in two steps: the email gets a 6-digit code,
// then code + new password sign the player in. It never says whether an account exists.
export default function ForgotPassword() {
  const api = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ field: 'email' | 'code' | 'password'; text: string } | undefined>();
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError(undefined);
    try {
      await api.auth.requestPasswordReset(email);
      setStep('code');
    } catch (e) {
      setError({ field: 'email', text: t(`errors.${toApiError(e).code}`) });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setError(undefined);
    if (!/^\d{6}$/.test(code.trim())) return setError({ field: 'code', text: t('errors.invalid_code') });
    if (password.length < 8) return setError({ field: 'password', text: t('errors.weak_password') });
    setBusy(true);
    try {
      await api.auth.resetPassword(email, code, password);
      toast(t('forgot.done'), 'success');
      router.replace('/');
    } catch (e) {
      const c = toApiError(e).code;
      setError({ field: c === 'weak_password' ? 'password' : 'code', text: t(`errors.${c}`) });
    } finally {
      setBusy(false);
    }
  }

  if (step === 'code') {
    return (
      <Screen>
        <AppText>{t('forgot.codeStep', { email: email.trim() })}</AppText>
        <TextField
          label={t('forgot.code')}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          error={error?.field === 'code' ? error.text : undefined}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
        />
        <TextField
          label={t('forgot.newPassword')}
          variant="password"
          value={password}
          onChangeText={setPassword}
          helper={t('signUp.passwordHelp')}
          error={error?.field === 'password' ? error.text : undefined}
          autoComplete="new-password"
          onSubmitEditing={save}
        />
        <Button label={t('forgot.save')} size="lg" fullWidth loading={busy} onPress={save} />
        <AppText variant="caption" tone="textMuted" align="center">
          {t('verify.spam')}
        </AppText>
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
        error={error?.field === 'email' ? error.text : undefined}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        onSubmitEditing={send}
      />
      <Button label={t('forgot.submit')} size="lg" fullWidth loading={busy} onPress={send} />
    </Screen>
  );
}
