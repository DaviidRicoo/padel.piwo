import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, ChipGroup, Screen, SegmentedControl, Stepper, TextField, type Chip } from '@/components/ui';
import { useApi } from '@/data/provider';
import { useAction } from '@/data/useAction';
import { SectionTitle } from '@/features/SectionTitle';
import { useI18n } from '@/i18n';
import { upcomingDays, zonedParts, zonedToUtc } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme';

const DAYS_AHEAD = 30;
// whole hours from 9:00 to 21:00: tournaments start on the hour
const TIMES = Array.from({ length: 13 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`);
type Size = '8' | '16' | '32';

// S18 Create a tournament: any member can, and becomes its organizer.
export default function NewTournament() {
  const t = useTheme();
  const api = useApi();
  const i18n = useI18n();
  const { t: tr } = i18n;
  const { busy, run } = useAction();
  const nowMs = useNow();

  const [days] = useState(() => upcomingDays(DAYS_AHEAD));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [place, setPlace] = useState('');
  const [dayIndex, setDayIndex] = useState('1');
  const [time, setTime] = useState<string | null>('10:00');
  const [size, setSize] = useState<Size>('8');
  const [roundDays, setRoundDays] = useState(7);
  const [tried, setTried] = useState(false);

  const day = days[Number(dayIndex)];
  const now = zonedParts(new Date(nowMs));
  const isToday = dayIndex === '0';
  const timeChips: Chip<string>[] = TIMES.map((x) => ({ value: x, label: x, disabled: isToday && Number(x.slice(0, 2)) * 60 <= now.hour * 60 + now.minute }));
  const startsAt = time ? zonedToUtc(day.year, day.month, day.day, Number(time.slice(0, 2)), 0) : null;
  const nameError = name.trim().length < 2 ? tr('newTournament.nameShort') : undefined;
  const timeError = !time ? tr('newMatch.pickTime') : startsAt && startsAt.getTime() <= nowMs ? tr('newMatch.timeGone') : undefined;
  const placeValue = place.trim() || tr('newMatch.placePlaceholder');

  async function submit() {
    setTried(true);
    if (nameError || timeError || !startsAt) return;
    let id = '';
    const ok = await run(
      'create',
      async () => {
        id = await api.createTournament({ name, description, place: placeValue, startsAt: startsAt.toISOString(), players: Number(size) as 8 | 16 | 32, roundDays });
      },
      tr('newTournament.created'),
    );
    if (ok) router.replace(`/tournament/${id}`);
  }

  return (
    <Screen footer={<Button label={tr('newTournament.submit')} size="lg" fullWidth loading={busy === 'create'} onPress={submit} />}>
      <TextField
        label={tr('newTournament.name')}
        value={name}
        onChangeText={setName}
        placeholder={tr('newTournament.namePlaceholder')}
        error={tried ? nameError : undefined}
        maxLength={80}
      />
      <TextField
        label={tr('newTournament.description')}
        value={description}
        onChangeText={setDescription}
        placeholder={tr('newTournament.descriptionPlaceholder')}
        multiline
        maxLength={500}
      />
      <TextField label={tr('newMatch.place')} value={place} onChangeText={setPlace} placeholder={tr('newMatch.placePlaceholder')} maxLength={120} />

      <View style={{ gap: t.space[2] }}>
        <AppText variant="label">{tr('newTournament.size')}</AppText>
        <SegmentedControl
          accessibilityLabel={tr('newTournament.size')}
          value={size}
          onChange={setSize}
          options={(['8', '16', '32'] as const).map((v) => ({ value: v, label: tr('tournament.players', { n: v }) }))}
        />
        <AppText variant="caption" tone="textMuted">
          {tr('newTournament.sizeHelp', { pairs: Number(size) / 2 })}
        </AppText>
      </View>

      <SectionTitle>{tr('newTournament.day')}</SectionTitle>
      <ChipGroup
        layout="scroll"
        accessibilityLabel={tr('newTournament.day')}
        value={dayIndex}
        onChange={(v) => {
          setDayIndex(v);
          if (v === '0') setTime(null);
        }}
        chips={days.map((d, i) => {
          const label = i18n.formatDayChip(d, i);
          return { value: String(i), label: label.top, sublabel: label.bottom };
        })}
      />
      <SectionTitle>{tr('newMatch.time')}</SectionTitle>
      <ChipGroup accessibilityLabel={tr('newMatch.time')} value={time} onChange={setTime} chips={timeChips} />
      {tried && timeError ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {timeError}
        </AppText>
      ) : null}

      <View style={{ gap: t.space[2] }}>
        <AppText variant="label">{tr('newTournament.roundDays')}</AppText>
        <View style={{ width: 200 }}>
          <Stepper label={tr('newTournament.roundDays')} value={roundDays} min={1} max={30} onChange={setRoundDays} />
        </View>
        <AppText variant="caption" tone="textMuted">
          {tr('newTournament.roundDaysHelp')}
        </AppText>
      </View>
    </Screen>
  );
}
