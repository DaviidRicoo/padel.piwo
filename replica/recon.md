# Recon map: Playtomic (Android + iOS)

Scope: bucle de partidos. Registro abierto, crear partido, unirse, registrar resultado con recordatorio push al terminar, partidos recientes, ranking con estadísticas, perfil, y torneos por parejas. Sin reserva de pistas ni pagos.
Nota: la parte de torneos (S17 a S21, F07 a F09) está diseñada con el usuario, no inferida de Playtomic, donde los torneos los crean los clubes. Cualquier miembro crea un torneo de 8, 16 o 32 jugadores (4, 8 o 16 parejas), eliminación directa con sorteo aleatorio.
For: la comunidad "Padel & Piwo" de Gdańsk (Polonia), confirmado por el usuario. Logos propios en `image/logo.jpg` y `image/logoHorizontal.jpg`: azul marino, dorado, blanco y verde salvia; raqueta con jarra de cerveza y pelota. Idiomas: español e inglés. Un solo grupo: la residencia del usuario en Gdańsk.
Date: 2026-11-13

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | help: open matches (resumen) | https://help.playtomic.com/en/articles/5713889-a-general-overview-the-match-model | leído solo en el extracto del buscador |
| 2 | help: amistoso vs competitivo | https://help.playtomic.com/en/articles/5689294-friendly-vs-competitive-open-matches | extracto del buscador |
| 3 | help: sistema de niveles | https://playerhelp.playtomic.com/hc/en-gb/articles/43310980754193-How-the-Playtomic-level-system-works | 403, no leído entero |
| 4 | help: rankings (general, temporada, club) | https://helpsyltek.playtomic.com/hc/en-gb/articles/23182764145681 | 403, no leído entero |
| 5 | help: secciones del perfil | https://playerhelp.playtomic.com/hc/en-gb/articles/19831576375313 | 403, no leído entero |
| 6 | help: pedir plaza en partido abierto | https://playerhelp.playtomic.com/hc/en-gb/articles/19832027031569-How-to-request-a-spot-in-a-public-match | extracto |
| 7 | App Store | https://apps.apple.com/pt/app/playtomic-play-padel/id1242321076 | extracto: stats gratis (jugados, ganados, perdidos, marcadores), avanzadas en Premium |

Lo que falta: capturas de cada pantalla. Sin ellas, la lista de pantallas es inferida. Para completarlo, necesito capturas de tu propia cuenta o de la ficha de las tiendas.

## Core loop

Un jugador crea o se une a un partido, lo juega, anota el resultado y ve cómo cambian su historial, su nivel y su posición en el ranking.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Bienvenida | primer arranque | entrar o registrarse | logo, 2 botones | única |
| S02 | Registro | desde S01 | crear cuenta | formulario, botones sociales | vacío, error de validación, cargando |
| S03 | Inicio de sesión | desde S01 | entrar | formulario, enlace de recuperar | error credenciales |
| S04 | Cuestionario de nivel | tras S02 | nivel inicial | preguntas por pasos, barra de progreso | inferida |
| S05 | Partidos (lista de abiertos) | pestaña 1 | encontrar partido | tarjetas de partido, filtros, botón crear | vacío, cargando, relleno, error de red |
| S06 | Crear partido | botón en S05 | publicar partido | selector fecha y hora, duración, lugar, tipo, plazas, rango de nivel | validación, cargando |
| S07 | Detalle de partido | tarjeta de S05 o S09 | ver jugadores y unirse | 4 huecos de jugador, equipos, botón unirse o salir, compartir | abierto, completo, en curso, finalizado, cancelado |
| S08 | Introducir resultado | desde S07 al terminar | guardar marcador | filas de sets, selector de equipo ganador | validación, confirmado |
| S09 | Partidos recientes | pestaña 2 | historial con resultados | lista con marcador, equipos, fecha, etiqueta victoria o derrota | vacío, relleno |
| S10 | Ranking | pestaña 3 | comparar jugadores | tabla con posición, avatar, jugados, ganados, win rate; selector de periodo | vacío, relleno, mi posición fijada |
| S11 | Perfil propio | pestaña 4 | ver mis datos y stats | cabecera, nivel, stats, últimos partidos | datos nuevos, completo |
| S12 | Editar perfil | desde S11 | cambiar datos | foto, nombre, mano, posición, ciudad | guardando, error |
| S13 | Perfil de otro jugador | tap en un jugador | ver stats ajenas | igual que S11 con botón seguir | público, privado |
| S14 | Ajustes | desde S11 | cuenta y preferencias | lista, cerrar sesión, borrar cuenta | confirmación de borrado |
| S15 | Notificaciones | campana en S05 | avisos | lista | vacío, relleno |
| S16 | Buscar jugadores | lupa | encontrar gente | buscador, resultados | vacío, sin resultados |
| S17 | Torneos | pestaña 5 | ver torneos abiertos, en curso y terminados | tarjetas de torneo (nombre, fecha, parejas inscritas de N), botón crear | vacío, relleno |
| S18 | Crear torneo | botón en S17 | publicar torneo | nombre, descripción, lugar, fecha, selector 8 / 16 / 32 jugadores, días por ronda | validación, cargando |
| S19 | Detalle de torneo | tarjeta de S17 | inscribirse y seguir el torneo | lista de parejas (confirmadas y pendientes), estado, botón inscribirse o retirarse, invitación pendiente, organizador con cancelar | inscripción, en curso, terminado, cancelado |
| S20 | Inscribir pareja | botón en S19 | elegir compañero | buscador de jugadores (como S16), resumen de la pareja | sin resultados, ya inscrito |
| S21 | Cuadro del torneo | desde S19 | ver cruces y resultados | cuadro de eliminación directa (2, 3 o 4 rondas), parejas, marcador, enlace al partido | sin sorteo, en curso, campeón |

## Flows

```
F01 Registro de usuario nuevo
    S01 -> S02 -> S04 -> S05
    happy path clicks: 5 (más el texto de los campos)
    edge: email ya usado, contraseña débil, sin red, saltar cuestionario

F02 Crear un partido
    S05 -> S06 -> S07
    happy path clicks: 4
    edge: fecha en el pasado, rango de nivel inválido, el anfitrión no puede ser el único jugador de un partido ya lleno

F03 Unirse a un partido
    S05 -> S07 -> (unirse)
    happy path clicks: 2
    edge: último hueco ocupado a la vez, nivel fuera de rango (pedir plaza), partido cancelado

F04 Registrar resultado
    S07 -> S08 -> S07 (finalizado) -> S09
    happy path clicks: 5
    edge: marcador inválido, el rival disputa, resultado ya enviado, partido amistoso (sin cambio de ranking), el rival no confirma (a los 7 días el anfitrión puede confirmar)

F05 Ver ranking
    S10
    happy path clicks: 1
    edge: aún sin partidos competitivos, empates de posición, mi posición fuera de pantalla

F06 Editar perfil
    S11 -> S12 -> S11
    happy path clicks: 3
    edge: foto grande, nombre vacío, sin red

F07 Crear un torneo
    S17 -> S18 -> S19
    happy path clicks: 4
    edge: fecha en el pasado, tamaño no permitido, el organizador cancela con parejas ya inscritas

F08 Inscribirse en pareja
    S19 -> S20 -> (el compañero recibe la invitación y acepta) -> S19
    happy path clicks: 4 por la persona que inscribe, 2 por el compañero
    edge: compañero ya inscrito con otra persona, el compañero rechaza, el compañero no responde, el cupo se llena mientras la invitación está pendiente (caduca), retirarse antes del sorteo

F09 Jugar el torneo
    (sorteo automático al llenarse) -> S21 -> S07 del partido -> S08 -> S21
    happy path clicks: 5 por partido
    edge: la pareja disputa el resultado, nadie responde (el organizador fija el resultado), cambio de fecha del partido, el organizador borra su cuenta (el torneo pasa a un jugador inscrito)
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Botón | primario, secundario, texto, peligro | normal, pulsado, deshabilitado, cargando | todas |
| Campo de texto | texto, contraseña, búsqueda | normal, foco, error | S02 S03 S12 S16 |
| Selector de fecha y hora | fecha, hora | normal, error | S06 |
| Tarjeta de partido | abierto, completo, finalizado | normal, pulsada | S05 S09 |
| Hueco de jugador | ocupado, libre, yo | normal | S07 |
| Fila de marcador (set) | 2-3 sets | vacía, rellena, error | S08 |
| Fila de ranking | normal, yo | normal | S10 |
| Chip de nivel | rangos | normal | S05 S07 S11 S13 |
| Avatar | tamaños, con iniciales | con foto, sin foto | casi todas |
| Barra de pestañas | 4 pestañas | activa, inactiva | S05 S09 S10 S11 |
| Diálogo de confirmación | normal, peligro | normal | S07 S14 |
| Aviso (toast) | éxito, error | normal | todas |
| Selector de compañero | buscador con avatar y nivel | vacío, sin resultados, elegido | S20 |
| Cuadro de torneo | 4, 8 o 16 parejas | sin sorteo, en curso, campeón | S21 |
| Tarjeta de torneo | abierto, en curso, terminado, cancelado | normal, pulsada | S17 |

## Inferred data model

```
User          id, email, password_hash, created_at, deleted_at
              evidence: S02 S03 S14
              confidence: high

Profile       user_id, display_name, avatar_url, city, hand, court_side, level, reliability
              evidence: S11 S12 S13, help "player profile" (título)
              confidence: medium (campos concretos inferidos)

Match         id, host_id, starts_at, duration_minutes, place, type (friendly | competitive), slots (4),
              level_min, level_max, status (open | full | played | cancelled), tournament_id (null si no es de torneo)
              evidence: S06 S07, help "friendly vs competitive", "open matches"
              confidence: high

MatchPlayer   match_id, user_id, team (A | B), joined_at, status (joined | requested | left)
              evidence: S07, help "request a spot"
              confidence: high

MatchResult   match_id, submitted_by, status (pending | confirmed | disputed)
              evidence: S08, help "level system" (resultado cambia nivel)
              confidence: medium

SetScore      match_id, set_number, team_a_games, team_b_games
              evidence: S08 S09, App Store ("final scores")
              confidence: medium

RatingChange  id, user_id, match_id, old_level, new_level, created_at
              evidence: help "level system"
              confidence: medium (el algoritmo exacto es propietario)

Follow        follower_id, followed_id
              evidence: App Store ("follows")
              confidence: medium

Notification  id, user_id, type, payload, read_at
              evidence: S15 (inferida)
              confidence: guess
```

Torneos (diseñados con el usuario, no inferidos del original):

```
Tournament      id, organizer_id, name, description, place, starts_at, max_pairs (4 | 8 | 16),
                round_days, status (registration | in_progress | finished | cancelled), champion_pair_id
TournamentPair  id, tournament_id, player1_id (quien inscribe), player2_id (el compañero),
                status (pending | confirmed | withdrawn), seed
TournamentTie   id, tournament_id, round_no, pos, pair_a_id, pair_b_id, match_id, winner_pair_id
                confidence: high (reglas fijadas con el usuario)
```

Relationships: User 1-1 Profile, User 1-n MatchPlayer, Match 1-n MatchPlayer (máx. 4), Match 1-1 MatchResult, MatchResult 1-n SetScore, User 1-n RatingChange. Tournament 1-n TournamentPair, Tournament 1-n TournamentTie, TournamentTie 0-1 Match (cada cruce crea un partido competitivo con las dos parejas), Tournament 1-n Match.

El ranking no necesita tabla propia: se calcula con una consulta sobre MatchPlayer, MatchResult y SetScore (jugados, ganados, win rate, perdidos).

## Feature matrix

See `features.csv`. Must: 29, should: 14, could: 11, skip: 6 (los skip son filas could). Total: 54 filas, 35 puntuables.
`parity.py` no puntúa las 13 filas con `original = no` (ideas del usuario que Playtomic no tiene: torneos creados por jugadores, sorteo automático, recordatorio de resultado...). Por eso solo 24 de los 29 imprescindibles cuentan para la nota de paridad. Esas 5 siguen siendo obligatorias para ti: compruébalas a mano antes de lanzar.
Hay que recontar tras cualquier cambio con `python parity.py replica/features.csv`.

## Out of scope (cannot or should not be cloned)

- La red de clubes y pistas, y la disponibilidad en tiempo real: son datos y acuerdos del original.
- Los jugadores y el historial del original.
- Pagos de pista y de partidos.
- Premium y estadísticas avanzadas.
- Torneos gestionados por clubes con cobro de inscripción. Los torneos de esta versión los crean los propios jugadores, sin pagos.
- El algoritmo de niveles de Playtomic, que es propietario. La versión propia usará un sistema tipo Elo con un nombre y una escala distintos a su escala 0-7.

## Size

Screens 21, flows 9, entities 12. Hard parts (los torneos añaden el sorteo bajo bloqueo, el avance de ganadores y los partidos creados por el sistema): (1) reglas de resultado y cálculo de nivel justo, con confirmación del rival, (2) concurrencia al ocupar el último hueco de un partido, (3) notificaciones push y builds en las dos tiendas (Apple exige Sign in with Apple y borrado de cuenta). Size: M (unas pocas semanas). Al ser una sola comunidad no hay multi-tenancy, lo que simplifica el esquema y el ranking.

## Confidence

La lista de funciones está bien respaldada por las fuentes. La lista exacta de pantallas y su aspecto es inferida, porque no he podido ver capturas. Los detalles de ranking (columnas, periodos) vienen del extracto del buscador.
