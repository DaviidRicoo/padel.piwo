import { router } from 'expo-router';
import { useState } from 'react';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { toApiError } from '@/data/errors';
import { useApi } from '@/data/provider';
import { useI18n } from '@/i18n';

// S03 Sign in.
export default function SignIn() {
  const api = useApi();
  const i18n = useI18n();
  const { t } = i18n;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const id = await api.auth.signIn(email, password);
      // the app speaks the language the player chose
      const me = await api.getProfile(id);
      i18n.setLocale(me.locale);
      router.replace('/');
    } catch (e) {
      setError(t(`errors.${toApiError(e).code}`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TextField label={t('signUp.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField
        label={t('signUp.password')}
        variant="password"
        value={password}
        onChangeText={setPassword}
        error={error}
        autoComplete="current-password"
        onSubmitEditing={submit}
      />
      <Button label={t('signIn.submit')} size="lg" fullWidth loading={busy} onPress={submit} />
      <Button label={t('signIn.forgot')} variant="ghost" fullWidth onPress={() => router.push('/forgot-password')} />
      <Button label={t('signIn.noAccount')} variant="ghost" fullWidth onPress={() => router.replace('/sign-up')} />
      {/* only while the fake data layer is in use; /replica-backend removes it */}
      <AppText variant="caption" tone="textMuted" align="center">
        {t('signIn.demoHint')}
      </AppText>
    </Screen>
  );
}
