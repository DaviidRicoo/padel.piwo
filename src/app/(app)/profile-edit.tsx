import { router } from 'expo-router';
import { ImagePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Avatar, Button, ErrorState, LoadingCards, Screen, SegmentedControl, TextField, useToast } from '@/components/ui';
import { useApi, useQuery, useUserId } from '@/data/provider';
import type { Profile } from '@/data/types';
import { useAction } from '@/data/useAction';
import { pickAvatar } from '@/features/avatarPicker';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

type Hand = 'right' | 'left' | 'none';
type Side = 'right' | 'left' | 'both' | 'none';

// S12 Edit profile: photo, name, city, playing hand and court side.
export default function EditProfile() {
  const api = useApi();
  const me = useUserId();
  const q = useQuery(`profile-edit-${me}`, () => api.getProfile(me!));

  if (q.loading)
    return (
      <Screen>
        <LoadingCards count={1} />
      </Screen>
    );
  if (q.error || !q.data)
    return (
      <Screen>
        <ErrorState onRetry={q.refetch} />
      </Screen>
    );
  // the form starts from the loaded profile, so it lives in its own component
  return <Form profile={q.data} />;
}

function Form({ profile }: { profile: Profile }) {
  const t = useTheme();
  const api = useApi();
  const { t: tr } = useI18n();
  const { busy, run } = useAction();
  const toast = useToast();
  const [name, setName] = useState(profile.displayName);
  const [city, setCity] = useState(profile.city ?? '');
  const [hand, setHand] = useState<Hand>(profile.hand ?? 'none');
  const [side, setSide] = useState<Side>(profile.courtSide ?? 'none');
  const nameError = name.trim().length < 1 || name.trim().length > 40 ? tr('errors.invalid_name') : undefined;
  const [tried, setTried] = useState(false);
  // the photo is saved on its own, straight away, apart from the form's Save button
  const [avatar, setAvatar] = useState(profile.avatarUrl);

  async function choosePhoto() {
    await run(
      'photo',
      async () => {
        const image = await pickAvatar();
        if (!image) return;
        setAvatar((await api.setAvatar(image)).avatarUrl);
        toast(tr('profileEdit.photoSaved'), 'success');
      },
    );
  }

  async function removePhoto() {
    await run('photoRemove', async () => setAvatar((await api.setAvatar(null)).avatarUrl), tr('profileEdit.photoRemoved'));
  }

  async function save() {
    setTried(true);
    if (nameError) return;
    const ok = await run(
      'save',
      () =>
        api.updateProfile({
          displayName: name,
          city: city.trim() || null,
          hand: hand === 'none' ? null : hand,
          courtSide: side === 'none' ? null : side,
        }),
      tr('profileEdit.saved'),
    );
    if (ok) router.back();
  }

  return (
    <Screen footer={<Button label={tr('profileEdit.save')} size="lg" fullWidth loading={busy === 'save'} onPress={save} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
        <Avatar name={name || profile.displayName} uri={avatar} size={88} />
        <View style={{ flex: 1, gap: t.space[2] }}>
          <View style={{ gap: 2 }}>
            <AppText variant="label">{tr('profileEdit.photo')}</AppText>
            <AppText variant="caption" tone="textMuted">
              {avatar ? tr('profileEdit.photoHelp') : tr('profileEdit.photoNone')}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
            <Button
              label={avatar ? tr('profileEdit.photoChange') : tr('profileEdit.photoChoose')}
              icon={ImagePlus}
              size="sm"
              variant="secondary"
              loading={busy === 'photo'}
              disabled={busy === 'photoRemove'}
              onPress={choosePhoto}
            />
            {avatar ? (
              <Button
                label={tr('profileEdit.photoRemove')}
                icon={Trash2}
                size="sm"
                variant="ghost"
                loading={busy === 'photoRemove'}
                disabled={busy === 'photo'}
                onPress={removePhoto}
              />
            ) : null}
          </View>
        </View>
      </View>
      <TextField label={tr('signUp.name')} value={name} onChangeText={setName} error={tried ? nameError : undefined} helper={tr('signUp.nameHelp')} maxLength={40} />
      <TextField label={tr('profileEdit.city')} value={city} onChangeText={setCity} placeholder="Gdańsk" maxLength={60} />
      <View style={{ gap: t.space[2] }}>
        <AppText variant="label">{tr('profileEdit.hand')}</AppText>
        <SegmentedControl<Hand>
          accessibilityLabel={tr('profileEdit.hand')}
          value={hand}
          onChange={setHand}
          options={[
            { value: 'right', label: tr('profileEdit.handRight') },
            { value: 'left', label: tr('profileEdit.handLeft') },
            { value: 'none', label: tr('profileEdit.notSet') },
          ]}
        />
      </View>
      <View style={{ gap: t.space[2] }}>
        <AppText variant="label">{tr('profileEdit.side')}</AppText>
        <SegmentedControl<Side>
          accessibilityLabel={tr('profileEdit.side')}
          value={side}
          onChange={setSide}
          options={[
            { value: 'right', label: tr('profileEdit.sideRight') },
            { value: 'left', label: tr('profileEdit.sideLeft') },
            { value: 'both', label: tr('profileEdit.sideBoth') },
            { value: 'none', label: tr('profileEdit.notSet') },
          ]}
        />
      </View>
    </Screen>
  );
}
