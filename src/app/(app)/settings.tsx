import { router } from 'expo-router';
import { AlarmClock, Brush, ClipboardCheck, LogOut, MonitorSmartphone, Trash2, Trophy, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, ConfirmDialog, ErrorState, Group, ICON_ROW_INSET, ListItem, Screen, SegmentedControl } from '@/components/ui';
import type { IconType } from '@/components/ui/types';
import { useApi, useQuery, useUserId } from '@/data/provider';
import type { Locale, NotificationSettings, PushCategory } from '@/data/types';
import { useAction } from '@/data/useAction';
import { useI18n, type MessageKey } from '@/i18n';
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
    <Screen>
      <View style={{ gap: t.space[2] }}>
        <AppText variant="label" tone="textMuted">
          {tr('settings.language')}
        </AppText>
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
      <View style={{ gap: t.space[2] }}>
        <AppText variant="label" tone="textMuted">
          {tr('settings.theme')}
        </AppText>
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
      <PushSettings />
      <Group inset={ICON_ROW_INSET}>
        {/* the design-system page is a tool for whoever builds the app, not for residents */}
        {__DEV__ ? <ListItem title={tr('settings.designSystem')} icon={Brush} onPress={() => router.push('/design')} /> : null}
        <ListItem title={tr('settings.signOut')} icon={LogOut} trailing={{ kind: 'none' }} onPress={() => setDialog('signOut')} />
        <ListItem title={tr('settings.signOutEverywhere')} icon={MonitorSmartphone} trailing={{ kind: 'none' }} onPress={() => setDialog('signOutEverywhere')} />
      </Group>
      <Group>
        <ListItem title={tr('settings.deleteAccount')} icon={Trash2} tone="danger" trailing={{ kind: 'none' }} onPress={() => setDialog('delete')} />
      </Group>

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

const PUSH_ROWS: { key: PushCategory; icon: IconType; title: MessageKey; help: MessageKey }[] = [
  { key: 'matches', icon: Users, title: 'settings.pushMatches', help: 'settings.pushMatchesHelp' },
  { key: 'results', icon: ClipboardCheck, title: 'settings.pushResults', help: 'settings.pushResultsHelp' },
  { key: 'reminders', icon: AlarmClock, title: 'settings.pushReminders', help: 'settings.pushRemindersHelp' },
  { key: 'tournaments', icon: Trophy, title: 'settings.pushTournaments', help: 'settings.pushTournamentsHelp' },
];

/** One switch per kind of push. Saved on the server, where send-push reads it. */
function PushSettings() {
  const t = useTheme();
  const api = useApi();
  const me = useUserId();
  const { t: tr } = useI18n();
  const { run } = useAction();
  const q = useQuery(`push-settings-${me}`, () => api.getNotificationSettings());
  // the switch moves at once; it goes back if saving fails
  const [local, setLocal] = useState<NotificationSettings | null>(null);
  const shown = local ?? q.data ?? null;

  async function toggle(key: PushCategory) {
    if (!shown) return;
    const before = shown;
    const next = { ...shown, [key]: !shown[key] };
    setLocal(next);
    const ok = await run(`push-${key}`, () => api.updateNotificationSettings({ [key]: next[key] }));
    if (!ok) setLocal(before);
  }

  return (
    <View style={{ gap: t.space[2], marginTop: t.space[2] }}>
      <AppText variant="label" tone="textMuted" accessibilityRole="header">
        {tr('settings.push')}
      </AppText>
      <AppText variant="bodySm" tone="textMuted">
        {tr('settings.pushHelp')}
      </AppText>
      {q.error ? (
        <ErrorState onRetry={q.refetch} />
      ) : (
        <Group inset={ICON_ROW_INSET}>
          {PUSH_ROWS.map((row) => (
            <ListItem
              key={row.key}
              title={tr(row.title)}
              subtitle={tr(row.help)}
              icon={row.icon}
              disabled={!shown}
              trailing={{ kind: 'switch', value: shown?.[row.key] ?? true }}
              onPress={() => toggle(row.key)}
            />
          ))}
        </Group>
      )}
    </View>
  );
}
