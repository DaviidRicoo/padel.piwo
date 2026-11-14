import { router } from 'expo-router';
import { Brush, LogOut, MonitorSmartphone, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, ConfirmDialog, ListItem, Screen, SegmentedControl } from '@/components/ui';
import { useApi } from '@/data/provider';
import type { Locale } from '@/data/types';
import { useAction } from '@/data/useAction';
import { useI18n } from '@/i18n';
import { useTheme, type ThemeMode } from '@/theme';

type Dialog = 'signOut' | 'signOutEverywhere' | 'delete' | null;

// S14 Settings: language, theme, sign out (here or everywhere) and delete the account.
export default function Settings() {
  const t = useTheme();
  const api = useApi();
  const i18n = useI18n();
  const { t: tr } = i18n;
  const { busy, run } = useAction();
  const [dialog, setDialog] = useState<Dialog>(null);

  async function changeLanguage(locale: Locale) {
    i18n.setLocale(locale);
    await run('locale', () => api.updateProfile({ locale }));
  }

  async function leave(name: 'signOut' | 'signOutEverywhere' | 'delete') {
    const action =
      name === 'delete' ? () => api.deleteAccount() : () => api.auth.signOut(name === 'signOutEverywhere');
    const ok = await run(name, action, name === 'delete' ? tr('settings.deleted') : undefined);
    setDialog(null);
    if (ok) router.replace('/welcome');
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
        <ListItem title={tr('settings.signOut')} icon={LogOut} trailing={{ kind: 'none' }} onPress={() => setDialog('signOut')} />
        <ListItem title={tr('settings.signOutEverywhere')} icon={MonitorSmartphone} trailing={{ kind: 'none' }} onPress={() => setDialog('signOutEverywhere')} />
        <ListItem title={tr('settings.deleteAccount')} icon={Trash2} tone="danger" trailing={{ kind: 'none' }} onPress={() => setDialog('delete')} />
      </View>

      <ConfirmDialog
        visible={dialog === 'signOut'}
        title={tr('settings.signOutTitle')}
        body={tr('settings.signOutBody')}
        confirmLabel={tr('settings.signOut')}
        cancelLabel={tr('common.cancel')}
        loading={busy === 'signOut'}
        onCancel={() => setDialog(null)}
        onConfirm={() => leave('signOut')}
      />
      <ConfirmDialog
        visible={dialog === 'signOutEverywhere'}
        title={tr('settings.signOutEverywhereTitle')}
        body={tr('settings.signOutEverywhereBody')}
        confirmLabel={tr('settings.signOut')}
        cancelLabel={tr('common.cancel')}
        loading={busy === 'signOutEverywhere'}
        onCancel={() => setDialog(null)}
        onConfirm={() => leave('signOutEverywhere')}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title={tr('settings.deleteTitle')}
        body={tr('settings.deleteBody')}
        confirmLabel={tr('settings.deleteAccount')}
        cancelLabel={tr('common.cancel')}
        destructive
        loading={busy === 'delete'}
        onCancel={() => setDialog(null)}
        onConfirm={() => leave('delete')}
      />
    </Screen>
  );
}
