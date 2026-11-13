import { useLocalSearchParams } from 'expo-router';
import { Bell, CalendarDays, Clock, Globe, Inbox, LogOut, Moon, Trash2, Trophy } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import {
  Bracket,
  MatchCard,
  PlayerRow,
  PlayerSlot,
  RankingHeader,
  RankingRow,
  ScoreLine,
  SetScoreRow,
  TournamentCard,
} from '@/components/app';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  LevelChip,
  ListItem,
  SegmentedControl,
  SelectField,
  Skeleton,
  TextField,
  useToast,
} from '@/components/ui';
import { tokens } from '@/theme/tokens';
import { useTheme, type ColorRole, type ThemeMode, type TypeVariant } from '@/theme';

// Every primitive with its states, in the current theme. Open with
// /design?theme=dark or /design?theme=light to force one (used for screenshots).
// All text here is sample data, written for this page.
export default function DesignScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ theme?: string; dialog?: string }>();
  const toast = useToast();

  useEffect(() => {
    if (params.theme === 'light' || params.theme === 'dark') t.setMode(params.theme);
    // only on arrival; afterwards the switch at the top is in charge
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.theme]);

  const [email, setEmail] = useState('ana@residencia.pl');
  const [password, setPassword] = useState('secreta123');
  const [search, setSearch] = useState('Mar');
  const [matchType, setMatchType] = useState<'friendly' | 'competitive'>('competitive');
  const [size, setSize] = useState<'8' | '16' | '32'>('8');
  const [period, setPeriod] = useState<'season' | 'all'>('season');
  const [set1, setSet1] = useState({ a: 6, b: 3 });
  const [set2, setSet2] = useState({ a: 4, b: 4 });
  const [partner, setPartner] = useState('marc');
  const [notify, setNotify] = useState(true);
  const [dialog, setDialog] = useState<'none' | 'leave' | 'delete'>(params.dialog === '1' ? 'delete' : 'none');

  const columns = { played: 'PJ', won: 'PG', winRate: '% V' };
  const roles = Object.keys(tokens.color.light) as ColorRole[];
  const variants = Object.keys(tokens.type) as TypeVariant[];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.color.bg }} contentContainerStyle={{ paddingBottom: t.space[16] }}>
      <View style={{ width: '100%', maxWidth: t.layout.maxContent, alignSelf: 'center' }}>
        <Section title="Tema">
          <SegmentedControl<ThemeMode>
            accessibilityLabel="Tema"
            value={t.mode}
            onChange={t.setMode}
            options={[
              { value: 'system', label: 'Sistema' },
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]}
          />
        </Section>

        <Section title="Colores (roles)">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
            {roles.map((role) => (
              <View key={role} style={{ width: 96, gap: t.space[1] }}>
                <View style={{ height: 40, borderRadius: t.radius.sm, backgroundColor: t.color[role], borderWidth: 1, borderColor: t.color.border }} />
                <AppText variant="caption" tone="textMuted" numberOfLines={1}>
                  {role}
                </AppText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Tipografía">
          {variants.map((v) => (
            <AppText key={v} variant={v} accessibilityRole="none">
              {`${v} · Partido a las 18:00`}
            </AppText>
          ))}
        </Section>

        <Section title="Botones">
          <Row>
            <Button label="Unirme" />
            <Button label="Invitar" variant="secondary" />
            <Button label="Ver todo" variant="ghost" />
          </Row>
          <Row>
            <Button label="Cancelar partido" variant="danger" />
            <Button label="Inscribirse" variant="gold" icon={Trophy} />
          </Row>
          <Row>
            <Button label="Pequeño" size="sm" />
            <Button label="Mediano" size="md" />
            <Button label="Grande" size="lg" />
          </Row>
          <Row>
            <Button label="Deshabilitado" disabled />
            <Button label="Guardando" loading />
          </Row>
          <Button label="Crear partido" fullWidth size="lg" />
        </Section>

        <Section title="Campos">
          <TextField label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" helper="Usa el correo con el que te registraste." />
          <TextField label="Contraseña" variant="password" value={password} onChangeText={setPassword} />
          <TextField label="Nombre" value="" onChangeText={() => {}} error="El nombre no puede estar vacío." />
          <TextField label="Buscar jugador" variant="search" value={search} onChangeText={setSearch} placeholder="Nombre" />
          <TextField label="Ciudad" value="Gdańsk" onChangeText={() => {}} disabled />
          <SelectField label="Fecha" value="Sábado 16 de noviembre" icon={CalendarDays} onPress={() => toast('Aquí se abrirá el selector de fecha')} />
          <SelectField label="Duración" placeholder="Elige la duración" icon={Clock} onPress={() => {}} error="Elige cuánto dura el partido." />
        </Section>

        <Section title="Selectores">
          <SegmentedControl
            accessibilityLabel="Tipo de partido"
            value={matchType}
            onChange={setMatchType}
            options={[
              { value: 'friendly', label: 'Amistoso' },
              { value: 'competitive', label: 'Competitivo' },
            ]}
          />
          <SegmentedControl
            accessibilityLabel="Tamaño del torneo"
            value={size}
            onChange={setSize}
            options={[
              { value: '8', label: '8 jugadores' },
              { value: '16', label: '16' },
              { value: '32', label: '32' },
            ]}
          />
          <SegmentedControl
            accessibilityLabel="Periodo del ranking"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'season', label: 'Temporada' },
              { value: 'all', label: 'Total' },
            ]}
          />
        </Section>

        <Section title="Avatares, nivel y estados">
          <Row>
            <Avatar name="Ana Kowalska" size={24} />
            <Avatar name="Ana Kowalska" size={32} />
            <Avatar name="Ana Kowalska" size={40} me />
            <Avatar name="Marc Ruiz" size={56} />
            <Avatar name="Jugador borrado" size={56} deleted />
            <Avatar name="Eva" size={88} />
          </Row>
          <Row>
            <LevelChip value={4.11} />
            <LevelChip value={3.89} size="sm" />
            <LevelChip range={[3, 5]} />
          </Row>
          <Row>
            <Badge label="Victoria" tone="success" />
            <Badge label="Derrota" tone="danger" />
            <Badge label="Pendiente" tone="warning" />
            <Badge label="Competitivo" tone="accent" />
            <Badge label="Amistoso" />
            <Badge label="Campeones" tone="gold" icon={Trophy} />
          </Row>
        </Section>

        <Section title="Tarjetas de partido">
          <MatchCard
            when="Sáb 16 nov · 18:00"
            place="Pista 1"
            duration="90 min"
            typeLabel="Competitivo"
            competitive
            levelRange={[3, 5]}
            slots={[{ name: 'Ana Kowalska', me: true }, { name: 'Marc Ruiz' }, null, null]}
            status="open"
            statusLabel="2 plazas libres"
            onPress={() => toast('Abrir el partido')}
          />
          <MatchCard
            when="Dom 17 nov · 11:00"
            place="Pista 2"
            duration="60 min"
            typeLabel="Amistoso"
            competitive={false}
            slots={[{ name: 'Eva Nowak' }, { name: 'Luis Gil' }, { name: 'Piotr Zieliński' }, { name: 'Ana Kowalska', me: true }]}
            status="full"
            statusLabel="Completo"
            onPress={() => {}}
          />
          <MatchCard
            when="Mié 13 nov · 19:30"
            place="Pista 1"
            typeLabel="Competitivo"
            competitive
            slots={[{ name: 'Ana Kowalska', me: true }, { name: 'Marc Ruiz' }, { name: 'Eva Nowak' }, { name: 'Luis Gil' }]}
            status="played"
            statusLabel="Jugado"
            sets={[
              { a: 6, b: 3 },
              { a: 4, b: 6 },
              { a: 10, b: 8 },
            ]}
            result={{ won: true, label: 'Victoria' }}
            onPress={() => {}}
          />
          <MatchCard
            when="Lun 11 nov · 20:00"
            place="Pista 3"
            typeLabel="Amistoso"
            competitive={false}
            slots={[{ name: 'Luis Gil' }, null, null, null]}
            status="cancelled"
            statusLabel="Cancelado"
            onPress={() => {}}
          />
          <View style={{ gap: t.space[2] }} accessibilityLabel="Cargando">
            <Skeleton height={20} width="60%" />
            <Skeleton height={14} width="40%" />
            <Skeleton height={32} />
          </View>
        </Section>

        <Section title="Jugadores del partido">
          <Row>
            <PlayerSlot teamLabel="Equipo A" me player={{ name: 'Ana Kowalska', level: 4.11 }} />
            <PlayerSlot teamLabel="Equipo A" player={{ name: 'Marc Ruiz', level: 3.95 }} />
          </Row>
          <Row>
            <PlayerSlot teamLabel="Equipo B" requested player={{ name: 'Eva Nowak', level: 6.2 }} />
            <PlayerSlot teamLabel="Equipo B" onJoin={() => toast('Te has unido al partido', 'success')} />
          </Row>
        </Section>

        <Section title="Resultado">
          <SetScoreRow setLabel="Set 1" a={set1.a} b={set1.b} onChange={(a, b) => setSet1({ a, b })} teamALabel="Equipo A" teamBLabel="Equipo B" />
          <SetScoreRow
            setLabel="Set 2"
            a={set2.a}
            b={set2.b}
            onChange={(a, b) => setSet2({ a, b })}
            teamALabel="Equipo A"
            teamBLabel="Equipo B"
            error={set2.a === set2.b ? 'Un set no puede acabar en empate.' : undefined}
          />
          <ScoreLine sets={[{ a: 6, b: 3 }, { a: 6, b: 4 }]} variant="title" />
        </Section>

        <Section title="Ranking" flush>
          <RankingHeader columns={columns} />
          <RankingRow position={1} name="Eva Nowak" level={5.42} played={18} won={15} winRate={83.3} columns={columns} />
          <RankingRow position={2} name="Marc Ruiz" level={4.87} played={20} won={14} winRate={70} columns={columns} />
          <RankingRow position={3} name="Piotr Zieliński" level={4.6} played={12} won={8} winRate={66.7} columns={columns} />
          <RankingRow position={7} name="Ana Kowalska" level={4.11} played={9} won={5} winRate={55.6} columns={columns} me />
        </Section>

        <Section title="Elegir compañero" flush>
          <PlayerRow name="Marc Ruiz" level={4.87} selectable selected={partner === 'marc'} onPress={() => setPartner('marc')} />
          <PlayerRow name="Luis Gil" level={3.7} selectable selected={partner === 'luis'} onPress={() => setPartner('luis')} />
          <PlayerRow name="Eva Nowak" selectable disabled disabledLabel="Ya inscrita en este torneo" />
        </Section>

        <Section title="Torneos">
          <TournamentCard
            name="Copa de otoño"
            when="Sáb 23 nov"
            place="Pista 1"
            sizeLabel="8 jugadores"
            confirmedPairs={3}
            maxPairs={4}
            progressLabel="3 de 4 parejas"
            status={{ label: 'Inscripción', tone: 'accent' }}
            onPress={() => {}}
          />
          <TournamentCard
            name="Torneo de la cerveza"
            when="Sáb 2 nov"
            place="Pista 2"
            sizeLabel="16 jugadores"
            confirmedPairs={8}
            maxPairs={8}
            progressLabel="8 de 8 parejas"
            status={{ label: 'Terminado', tone: 'neutral' }}
            champion="Eva Nowak / Luis Gil"
            onPress={() => {}}
          />
        </Section>

        <Section title="Cuadro del torneo" flush>
          <Bracket
            rounds={[
              {
                title: 'Semifinal',
                ties: [
                  { id: 's1', a: 'Ana / Marc', b: 'Eva / Luis', sets: [{ a: 6, b: 3 }, { a: 6, b: 4 }], winner: 'a' },
                  { id: 's2', a: 'Piotr / Kasia', b: 'Jan / Ola' },
                ],
              },
              { title: 'Final', ties: [{ id: 'f', a: 'Ana / Marc' }] },
            ]}
          />
        </Section>

        <Section title="Lista y ajustes" flush>
          <ListItem title="Idioma" icon={Globe} trailing={{ kind: 'value', text: 'Español' }} onPress={() => {}} />
          <ListItem title="Notificaciones" subtitle="Recordatorios de resultado" icon={Bell} trailing={{ kind: 'switch', value: notify }} onPress={() => setNotify((n) => !n)} />
          <ListItem title="Tema" icon={Moon} onPress={() => {}} />
          <ListItem title="Cerrar sesión" icon={LogOut} trailing={{ kind: 'none' }} onPress={() => setDialog('leave')} />
          <ListItem title="Borrar cuenta" icon={Trash2} tone="danger" trailing={{ kind: 'none' }} onPress={() => setDialog('delete')} />
        </Section>

        <Section title="Vacío">
          <EmptyState icon={Inbox} title="No hay partidos abiertos" body="Crea uno y avisa a la residencia." actionLabel="Crear partido" onAction={() => {}} />
        </Section>

        <Section title="Avisos">
          <Row>
            <Button label="Aviso" variant="secondary" onPress={() => toast('Partido creado')} />
            <Button label="Éxito" variant="secondary" onPress={() => toast('Resultado confirmado', 'success')} />
            <Button label="Error" variant="secondary" onPress={() => toast('Sin conexión. Inténtalo de nuevo.', 'error')} />
          </Row>
        </Section>
      </View>

      <ConfirmDialog
        visible={dialog === 'leave'}
        title="¿Cerrar sesión?"
        body="Tendrás que volver a entrar con tu correo."
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        onConfirm={() => setDialog('none')}
        onCancel={() => setDialog('none')}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title="¿Borrar tu cuenta?"
        body="Tu perfil se anonimiza y sales de los partidos que aún no se han jugado. No se puede deshacer."
        confirmLabel="Borrar cuenta"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => setDialog('none')}
        onCancel={() => setDialog('none')}
      />
    </ScrollView>
  );
}

function Section({ title, children, flush }: { title: string; children: ReactNode; flush?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ paddingTop: t.space[8], gap: t.space[3] }}>
      <AppText variant="title" style={{ paddingHorizontal: t.layout.gutter }}>
        {title}
      </AppText>
      <View style={{ gap: flush ? 0 : t.space[3], paddingHorizontal: flush ? 0 : t.layout.gutter }}>{children}</View>
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space[2] }}>{children}</View>;
}
