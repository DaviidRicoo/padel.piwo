import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, ChipGroup, Screen, SegmentedControl, Stepper, TextField, type Chip } from '@/components/ui';
import { useApi } from '@/data/provider';
import { LEVEL_MAX, LEVEL_MIN } from '@/data/rules';
import type { MatchType } from '@/data/types';
import { useAction } from '@/data/useAction';
import { SectionTitle } from '@/features/SectionTitle';
import { useI18n } from '@/i18n';
import { upcomingDays, zonedParts, zonedToUtc } from '@/lib/time';
import { registerForPush } from '@/lib/push';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme';

const DAYS_AHEAD = 14;
// half-hour slots from 8:00 to 22:30
const TIMES = Array.from({ length: 30 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
type Duration = '60' | '90' | '120';

// S06 Create a match.
export default function NewMatch() {
  const t = useTheme();
  const api = useApi();
  const i18n = useI18n();
  const { t: tr } = i18n;
  const { busy, run } = useAction();

  const [days] = useState(() => upcomingDays(DAYS_AHEAD));
  const [dayIndex, setDayIndex] = useState('0');
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<Duration>('90');
  const [place, setPlace] = useState('');
  const [type, setType] = useState<MatchType>('competitive');
  const [levelMin, setLevelMin] = useState(LEVEL_MIN);
  const [levelMax, setLevelMax] = useState(LEVEL_MAX);
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);

  const nowMs = useNow();
  const day = days[Number(dayIndex)];
  const now = zonedParts(new Date(nowMs));
  const isToday = dayIndex === '0';
  const nowMinutes = now.hour * 60 + now.minute;
  const timeChips: Chip<string>[] = TIMES.map((x) => {
    const [h, m] = x.split(':').map(Number);
    return { value: x, label: x, disabled: isToday && h * 60 + m <= nowMinutes };
  });
  const startsAt = time ? zonedToUtc(day.year, day.month, day.day, Number(time.slice(0, 2)), Number(time.slice(3))) : null;
  const timeError = !time ? tr('newMatch.pickTime') : startsAt && startsAt.getTime() <= nowMs ? tr('newMatch.timeGone') : undefined;
  const placeValue = place.trim() || tr('newMatch.placePlaceholder');
  const fmt = (n: number) => i18n.formatNumber(n, 1);

  async function submit() {
    setTried(true);
    if (timeError || !startsAt) return;
    let id = '';
    const ok = await run(
      'create',
      async () => {
        id = await api.createMatch({
          startsAt: startsAt.toISOString(),
          durationMinutes: Number(duration),
          place: placeValue,
          type,
          levelMin,
          levelMax,
          notes,
        });
      },
      tr('newMatch.created'),
    );
    if (ok) {
      router.replace(`/match/${id}`);
      // reminders start to matter with the first match: ask for push permission now
      registerForPush(api, { ask: true });
    }
  }

  return (
    <Screen footer={<Button label={tr('newMatch.submit')} size="lg" fullWidth loading={busy === 'create'} onPress={submit} />}>
      <SectionTitle>{tr('newMatch.day')}</SectionTitle>
      <ChipGroup
        layout="scroll"
        accessibilityLabel={tr('newMatch.day')}
        value={dayIndex}
        onChange={(v) => {
          setDayIndex(v);
          setTime(null);
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

      <SectionTitle>{tr('newMatch.duration')}</SectionTitle>
      <SegmentedControl
        accessibilityLabel={tr('newMatch.duration')}
        value={duration}
        onChange={setDuration}
        options={(['60', '90', '120'] as const).map((v) => ({ value: v, label: tr('common.minutes', { n: v }) }))}
      />

      <TextField label={tr('newMatch.place')} value={place} onChangeText={setPlace} placeholder={tr('newMatch.placePlaceholder')} maxLength={120} />

      <View style={{ gap: t.space[2] }}>
        <AppText variant="label">{tr('newMatch.type')}</AppText>
        <SegmentedControl
          accessibilityLabel={tr('newMatch.type')}
          value={type}
          onChange={setType}
          options={[
            { value: 'competitive', label: tr('match.typeCompetitive') },
            { value: 'friendly', label: tr('match.typeFriendly') },
          ]}
        />
        <AppText variant="caption" tone="textMuted">
          {tr('newMatch.typeHelp')}
        </AppText>
      </View>

      <View style={{ gap: t.space[2] }}>
        <AppText variant="label">{tr('newMatch.level')}</AppText>
        <View style={{ flexDirection: 'row', gap: t.space[3] }}>
          <View style={{ flex: 1, gap: t.space[1] }}>
            <AppText variant="caption" tone="textMuted">
              {tr('newMatch.levelMin')}
            </AppText>
            <Stepper
              label={`${tr('newMatch.level')}, ${tr('newMatch.levelMin')}`}
              value={levelMin}
              min={LEVEL_MIN}
              max={LEVEL_MAX}
              step={0.5}
              format={fmt}
              onChange={(v) => {
                setLevelMin(v);
                if (v > levelMax) setLevelMax(v);
              }}
            />
          </View>
          <View style={{ flex: 1, gap: t.space[1] }}>
            <AppText variant="caption" tone="textMuted">
              {tr('newMatch.levelMax')}
            </AppText>
            <Stepper
              label={`${tr('newMatch.level')}, ${tr('newMatch.levelMax')}`}
              value={levelMax}
              min={LEVEL_MIN}
              max={LEVEL_MAX}
              step={0.5}
              format={fmt}
              onChange={(v) => {
                setLevelMax(v);
                if (v < levelMin) setLevelMin(v);
              }}
            />
          </View>
        </View>
        <AppText variant="caption" tone="textMuted">
          {tr('newMatch.levelHelp')}
        </AppText>
      </View>

      <TextField label={tr('newMatch.notes')} value={notes} onChangeText={setNotes} placeholder={tr('newMatch.notesPlaceholder')} multiline maxLength={500} />
    </Screen>
  );
}
