import { CircleCheck, Trophy } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText, Badge } from '@/components/ui';
import { useFocusRing } from '@/components/ui/focus';
import { useTheme } from '@/theme';

import { ScoreLine, type SetScore } from './ScoreLine';

export interface BracketTie {
  id: string;
  /** the tie's match, once both pairs are known; makes the tie pressable */
  matchId?: string;
  /** "Ana / Luis"; undefined while the previous round is still being played */
  a?: string;
  b?: string;
  sets?: SetScore[];
  winner?: 'a' | 'b';
}

export interface BracketRound {
  title: string;
  ties: BracketTie[];
}

export interface BracketProps {
  rounds: BracketRound[];
  champion?: string;
  championLabel?: string;
  tbdLabel?: string;
  versusWord?: string;
  winsWord?: string;
  /** opens a tie's match */
  onPressTie?: (tie: BracketTie) => void;
}

const COLUMN = 200;
const SLOT = 104; // vertical room for one first-round tie

/**
 * Single-elimination bracket, one column per round, scrolled sideways. Each
 * round's ties are centred between the two ties that feed them.
 */
export function Bracket({ rounds, champion, championLabel = 'Campeones', tbdLabel = 'Por decidir', versusWord = 'contra', winsWord = 'ganan', onPressTie }: BracketProps) {
  const t = useTheme();
  const height = (rounds[0]?.ties.length ?? 1) * SLOT;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space[3], paddingHorizontal: t.layout.gutter }}>
      {rounds.map((round) => (
        <View key={round.title} style={{ width: COLUMN, gap: t.space[2] }}>
          <AppText variant="label" tone="textMuted" accessibilityRole="header">
            {round.title}
          </AppText>
          <View style={{ height, justifyContent: 'space-around' }}>
            {round.ties.map((tie, i) => {
              const a = tie.a ?? tbdLabel;
              const b = tie.b ?? tbdLabel;
              const score = tie.sets ? tie.sets.map((s) => `${s.a}-${s.b}`).join(' ') : '';
              const won = tie.winner ? `, ${winsWord} ${tie.winner === 'a' ? a : b}` : '';
              return (
                <TieBox
                  key={tie.id}
                  label={`${round.title} ${i + 1}: ${a} ${versusWord} ${b}${score ? `, ${score}` : ''}${won}`}
                  onPress={onPressTie && tie.matchId ? () => onPressTie(tie) : undefined}>
                  <Side name={tie.a} tbd={tbdLabel} winner={tie.winner === 'a'} />
                  <Side name={tie.b} tbd={tbdLabel} winner={tie.winner === 'b'} />
                  {tie.sets ? <ScoreLine sets={tie.sets} variant="caption" /> : null}
                </TieBox>
              );
            })}
          </View>
        </View>
      ))}
      <View style={{ width: COLUMN * 0.8, gap: t.space[2] }}>
        <AppText variant="label" tone="textMuted" accessibilityRole="header">
          {championLabel}
        </AppText>
        <View style={{ height, justifyContent: 'center', alignItems: 'flex-start', gap: t.space[2] }}>
          <Trophy color={champion ? t.color.goldText : t.color.textMuted} size={32} />
          {champion ? (
            <>
              <Badge label={championLabel} tone="gold" />
              <AppText variant="label">{champion}</AppText>
            </>
          ) : (
            <AppText variant="bodySm" tone="textMuted">
              {tbdLabel}
            </AppText>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function TieBox({ label, onPress, children }: { label: string; onPress?: () => void; children: ReactNode }) {
  const t = useTheme();
  const focus = useFocusRing();
  const box = { gap: t.space[1], padding: t.space[3], borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border, backgroundColor: t.color.surface };
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={box}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      {...focus.handlers}
      style={({ pressed }) => [box, pressed ? { backgroundColor: t.color.surface2 } : null, focus.ring]}>
      {children}
    </Pressable>
  );
}

function Side({ name, tbd, winner }: { name?: string; tbd: string; winner: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[1], minHeight: 22 }}>
      <AppText
        variant={winner ? 'label' : 'bodySm'}
        tone={name ? 'text' : 'textMuted'}
        numberOfLines={1}
        style={[{ flex: 1 }, name ? null : { fontStyle: 'italic' }]}>
        {name ?? tbd}
      </AppText>
      {winner ? <CircleCheck color={t.color.success} size={16} /> : null}
    </View>
  );
}
