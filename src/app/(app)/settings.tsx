import { router } from 'expo-router';
import { Brush, LogOut, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, ConfirmDialog, ListItem, Screen, SegmentedControl, useToast } from '@/components/ui';
import { useApi } from '@/data/provider';
import type { Locale } from '@/data/types';
import { useAction } from '@/data/useAction';
import { useI18n } from '@/i18n';
import { useTheme, type ThemeMode } from '@/theme';

// S14 Settings: language, theme, sign out. Deleting the account needs the real backend.
export default function Settings() {
  const t = useTheme();
  const api = useApi();
  const i18n = useI18n();
  const { t: tr } = i18n;
  const toast = useToast();
  const { busy, run } = useAction();
  const [askSignOut, setAskSignOut] = useState(false);

  async function changeLanguage(locale: Locale) {
    i18n.setLocale(locale);
    await run('locale', () => api.updateProfile({ locale }));
  }

  return (
    <Screen flush>
      <View style={{ gap: t.space[2], paddingHorizontal: t.layout.gutter }}>
        <AppText variant="label">{tr('settings.language')}</AppText>
        <SegmentedControl
          accessibilityLabel={tr('settings.language')}
          value={i18n.locale}
          onChange={changeLanguage}
          options={[
            { value: 'es', label: tr('settings.languageEs') },
            { value: 'en', label: tr('settings.languageEn') },
          ]}
        />
      </View>
      <View style={{ gap: t.space[2], paddingHorizontal: t.layout.gutter }}>
        <AppText variant="label">{tr('settings.theme')}</AppText>
        <SegmentedControl<ThemeMode>
          accessibilityLabel={tr('settings.theme')}
          value={t.mode}
          onChange={t.setMode}
          options={[
            { value: 'system', label: tr('settings.themeSystem') },
            { value: 'light', label: tr('settings.themeLight') },
            { value: 'dark', label: tr('settings.themeDark') },
          ]}
        />
      </View>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.color.border }}>
        <ListItem title={tr('settings.designSystem')} icon={Brush} onPress={() => router.push('/design')} />
        <ListItem title={tr('settings.signOut')} icon={LogOut} trailing={{ kind: 'none' }} onPress={() => setAskSignOut(true)} />
        <ListItem title={tr('settings.deleteAccount')} icon={Trash2} tone="danger" trailing={{ kind: 'none' }} onPress={() => toast(tr('settings.deleteSoon'))} />
      </View>

      <ConfirmDialog
        visible={askSignOut}
        title={tr('settings.signOutTitle')}
        body={tr('settings.signOutBody')}
        confirmLabel={tr('settings.signOut')}
        cancelLabel={tr('common.cancel')}
        loading={busy === 'signOut'}
        onCancel={() => setAskSignOut(false)}
        onConfirm={async () => {
          setAskSignOut(false);
          if (await run('signOut', () => api.auth.signOut())) router.replace('/welcome');
        }}
      />
    </Screen>
  );
}
