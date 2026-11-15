import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Screen, TextField, useToast } from '@/components/ui';
import { toApiError, type ErrorCode } from '@/data/errors';
import { useApi } from '@/data/provider';
import { useI18n } from '@/i18n';

type Field = 'name' | 'email' | 'password';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_OF: Partial<Record<ErrorCode, Field>> = {
  invalid_name: 'name',
  invalid_email: 'email',
  email_taken: 'email',
  weak_password: 'password',
};

// S02 Sign up. Signup is open: name, email and password.
export default function SignUp() {
  const api = useApi();
  const i18n = useI18n();
  const { t } = i18n;
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    // check every field first, so all problems show at once; the server checks again
    const local: Partial<Record<Field, string>> = {};
    if (name.trim().length < 1 || name.trim().length > 40) local.name = t('errors.invalid_name');
    if (!EMAIL.test(email.trim())) local.email = t('errors.invalid_email');
    if (password.length < 8) local.password = t('errors.weak_password');
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      const { needsConfirmation } = await api.auth.signUp({ email, password, displayName: name, locale: i18n.locale });
      // with email confirmation on, the account activates with the emailed code
      if (needsConfirmation) router.push({ pathname: '/verify-email', params: { email: email.trim() } });
      else router.replace('/');
    } catch (e) {
      const code = toApiError(e).code;
      const field = FIELD_OF[code];
      if (field) setErrors({ [field]: t(`errors.${code}`) });
      else toast(t(`errors.${code}`), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TextField label={t('signUp.name')} value={name} onChangeText={setName} helper={t('signUp.nameHelp')} error={errors.name} autoComplete="name" maxLength={40} />
      <TextField
        label={t('signUp.email')}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextField
        label={t('signUp.password')}
        variant="password"
        value={password}
        onChangeText={setPassword}
        helper={t('signUp.passwordHelp')}
        error={errors.password}
        autoComplete="new-password"
        onSubmitEditing={submit}
      />
      <Button label={t('signUp.submit')} size="lg" fullWidth loading={busy} onPress={submit} />
      <Button label={t('signUp.haveAccount')} variant="ghost" fullWidth onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}
