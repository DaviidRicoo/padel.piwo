# Componentes: Padel & Piwo

Fuente de los valores: `replica/design/tokens.json`. Cada componente usa roles (`accent`, `text-muted`, `surface`...), nunca un color suelto. Los dos temas (claro y oscuro) tienen los mismos roles, así que un componente funciona en ambos sin cambios.

No había capturas de Playtomic, así que las medidas no se tomaron del original. Son medidas estándar de móvil (objetivo táctil mínimo de 44 px, escala de 4 px). Los colores salen de tus logos.

Nombres en el código: los roles y variantes de `tokens.json` llegan al código en camelCase, generados por `build_tokens.py` en `src/theme/tokens.ts`. Por ejemplo, `text-muted` es `textMuted`, `surface-2` es `surface2` y `body-sm` es `bodySm`. Los componentes los leen con `useTheme()`.

Sin Tailwind: el último Expo es el SDK 58, y NativeWind estable (4.2.7) solo está documentado hasta el SDK 57. Para no quedar fuera de Expo Go, el tema es un objeto tipado generado desde `tokens.json`, en lugar de clases de Tailwind. La regla es la misma: ningún color suelto en los componentes, y `grep` lo comprueba.

Código: `src/components/ui/` (primitivas) y `src/components/app/` (componentes de la app). Todos se ven, con sus estados y en los dos temas, en la ruta `/design` de la app.

## Reglas comunes

- **Contraste:** solo se usan los pares de texto y fondo listados en `tokens.json` → `pairs`, que pasan AA. Un componente nuevo que necesite otro par lo añade allí y vuelve a pasar `contrast.py`.
- **Foco:** en web y con teclado, anillo de 2 px en `focus` con 2 px de separación. En móvil, los lectores de pantalla (TalkBack y VoiceOver) usan los roles y etiquetas de cada componente.
- **Pulsado:** opacidad `opacity.pressed` (0,85) o fondo `surface-2`. **Deshabilitado:** opacidad `opacity.disabled` (0,45), `accessibilityState.disabled` y sin respuesta al toque.
- **Texto escalable:** todo el texto respeta el tamaño de letra del sistema, hasta 1,6 veces. Nada se corta con el texto grande: las filas crecen en alto.
- **Movimiento:** duraciones `motion.fast` (120 ms) y `motion.base` (200 ms). Si el sistema pide reducir movimiento, sin animación.
- **Iconos:** Lucide (licencia ISC), nunca iconos de Playtomic. Siempre acompañados de texto o de `accessibilityLabel`.
- **Textos:** todos los textos de la app son propios y van en `es` y `en`. Ninguno se copia de Playtomic.

## Primitivas

```
AppText
  variants  caption 12/16 500, label 14/20 600, body-sm 14/20 400, body 16/24 400,
            heading 18/24 700, title 22/28 700, display 30/36 800
  fuentes   heading, title, display: Montserrat. El resto: Inter.
  color     prop `tone`: text (por defecto), text-muted, accent-text, gold-text, sage-text,
            danger, success, warning, on-accent...
  a11y      heading, title y display llevan accessibilityRole="header"
  usado en  todas
```

```
Button
  variants  primary (accent / on-accent), secondary (surface, borde border, texto text),
            ghost (sin fondo, accent-text), danger (danger / on-danger), gold (gold / on-gold)
  sizes     sm 36 px, md 44 px, lg 52 px; ancho completo opcional
  states    default, pressed, focus-visible, disabled, loading (spinner + la etiqueta se mantiene
            para el lector de pantalla, accessibilityState.busy)
  tokens    radius md, texto label, icono opcional a la izquierda (20 px)
  a11y      accessibilityRole="button", objetivo táctil mínimo 44 px (hitSlop en sm)
  usado en  S01, S02, S03, S06, S07, S08, S12, S14, S18, S19, S20
```

```
TextField
  variants  text, password (botón mostrar u ocultar con etiqueta), search (icono lupa y botón borrar),
            multiline
  states    default (borde border-input 1 px), focused (borde focus 2 px), filled,
            error (borde danger + mensaje en danger), disabled
  partes    etiqueta encima (label), campo (body), ayuda debajo (caption, text-muted)
  tokens    alto control-md, radius md, fondo bg, padding 12
  a11y      la etiqueta es el accessibilityLabel; el error se anuncia (liveRegion polite)
  usado en  S02, S03, S06, S12, S16, S18, S20
```

```
SelectField
  qué es    parece un TextField pero abre un selector (fecha, hora, duración). El selector nativo
            se añade en /replica-build.
  states    default, filled, error, disabled
  a11y      accessibilityRole="button" con el valor actual en el label
  usado en  S06 (fecha, hora, duración), S18 (fecha, días por ronda)
```

```
SegmentedControl
  opciones  2 a 4
  states    seleccionado (accent / on-accent), no seleccionado (text-muted sobre surface),
            pressed, disabled
  tokens    radius pill, alto control-sm
  a11y      accessibilityRole="radiogroup"; cada opción "radio" con checked
  usado en  S06 (amistoso o competitivo), S10 (periodo), S18 (8, 16 o 32 jugadores)
```

```
Avatar
  sizes     24, 32, 40, 56, 88
  states    foto, iniciales (surface-2 / text), cuenta borrada (icono y text-muted),
            "yo" (anillo accent de 2 px)
  a11y      accessibilityRole="image" con el nombre del jugador
  usado en  S05, S07, S09, S10, S11, S12, S13, S16, S20
```

```
LevelChip
  variants  nivel ("4,11") o rango ("3,0–5,0"); sizes sm, md
  tokens    sage / on-sage, radius pill, texto caption o label
  a11y      label "Nivel 4,11" o "Nivel de 3 a 5"
  usado en  S05, S06, S07, S10, S11, S13, S20
```

```
Badge
  tones     neutral (surface-2 / text), success (success / on-success), danger (danger / on-danger),
            warning (borde y texto warning sobre surface), gold (gold / on-gold),
            accent (accent / on-accent)
  usos      victoria, derrota, pendiente, disputado, abierto, completo, jugado, cancelado,
            inscripción, en curso, terminado, campeón
  a11y      el texto ya dice el estado; el color nunca es la única señal
  usado en  S05, S07, S09, S17, S19, S21
```

```
Card
  variants  estática, pulsable
  states    default, pressed (surface-2), focus-visible
  tokens    surface, radius lg, padding 16, borde border, sombra card
  a11y      la pulsable es accessibilityRole="button" con un resumen como label
  usado en  base de MatchCard, TournamentCard y bloques de perfil
```

```
ListItem
  partes    icono, título, subtítulo, elemento final (chevron, interruptor o valor)
  variants  normal, danger (texto danger, para "Borrar cuenta")
  states    default, pressed, disabled
  a11y      button o switch según el elemento final
  usado en  S14, S15
```

```
EmptyState
  partes    icono 40 px (text-muted), título (heading), texto (body-sm, text-muted),
            acción opcional (Button)
  usado en  S05 (sin partidos), S09, S10, S15, S16, S17, S21 (sin sorteo)
```

```
Skeleton
  qué es    bloque gris (surface-2) con pulso suave para los estados de carga;
            sin animación si se pide reducir movimiento
  a11y      oculto al lector de pantalla; el contenedor anuncia "Cargando"
  usado en  S05, S09, S10, S17
```

```
ProgressBar
  tokens    pista surface-2, relleno accent (contraste ui ≥ 3:1 comprobado en los dos temas),
            alto 6, radius pill
  a11y      accessibilityRole="progressbar" con min, max y now; el texto "3 de 4 parejas" siempre al lado
  usado en  S17, S19
```

```
ConfirmDialog
  partes    velo scrim (opacidad 0,55), tarjeta surface con radius xl, título, texto, acciones
  variants  normal (confirmar primary), destructiva (confirmar danger)
  a11y      Modal con accessibilityViewIsModal; el botón atrás de Android cierra;
            cancelar va primero
  usado en  S07 (salir o cancelar partido), S14 (borrar cuenta), S19 (retirarse o cancelar torneo)
```

```
Toast
  tones     info (accent / on-accent), success (success / on-success), error (danger / on-danger)
  comport.  arriba, bajo la cabecera, se cierra solo a los 3 s. Deja pasar los toques.
            Antes iba abajo, pero tapaba el botón principal del pie de pantalla
            (encontrado en /replica-build, tanda 2).
  a11y      se anuncia con AccessibilityInfo.announceForAccessibility
  usado en  todas (confirmaciones y errores de red)
```

```
Stepper   (añadido en /replica-build)
  qué es    número con botones − y +; mínimo, máximo, paso y formato (4,5)
  states    normal, en el límite (botón deshabilitado), error (borde danger)
  a11y      un único elemento accessibilityRole="adjustable" con increment y decrement;
            los botones no son paradas separadas
  usado en  S06 (nivel mínimo y máximo), S08 (vía SetScoreRow)
```

```
ChipGroup   (añadido en /replica-build)
  qué es    elegir una opción entre muchas: fila con scroll (días) o rejilla (horas)
  states    seleccionado (accent / on-accent), normal (surface), pulsado, deshabilitado (hora pasada)
  a11y      radiogroup; cada chip es un radio con checked
  usado en  S06 (día y hora). Sustituye al selector nativo de fecha: funciona igual en web y móvil.
```

```
Screen, LoadingCards, ErrorState   (añadidos en /replica-build)
  Screen    pantalla con scroll, centrada y con ancho máximo max-content; tirar para recargar;
            pie fijo opcional para la acción principal
  Loading   tarjetas Skeleton mientras carga una lista (nunca un spinner a pantalla completa)
  Error     EmptyState con "Reintentar"
  usado en  todas las pantallas
```

## Componentes de la app

```
MatchCard
  partes    fecha y hora (heading), lugar y duración (body-sm, text-muted), Badge de tipo,
            LevelChip de rango, 4 huecos en 2 contra 2 (Avatar o hueco libre con borde
            discontinuo border-input), estado ("2 plazas libres", "Completo") o marcador si se jugó
  states    abierto, completo, jugado (con marcador y victoria o derrota para mí), cancelado
            (todo en text-muted), cargando (Skeleton)
  a11y      un único label: "Sábado 18:00, Pista 1, competitivo, 2 plazas libres"
  usado en  S05, S09, S11, S13
```

```
PlayerSlot
  states    ocupado (Avatar, nombre, LevelChip), libre (borde discontinuo y "Unirme"),
            yo (anillo accent y "Tú"), solicitado (Badge pendiente)
  a11y      el libre es un botón "Unirme al equipo A"
  usado en  S07
```

```
SetScoreRow
  partes    "Set 1", dos contadores (− valor +) para el equipo A y el B, de 0 a 20
  states    vacío, relleno, error (los dos números iguales: mensaje en danger)
  a11y      cada contador es accessibilityRole="adjustable" con acciones increment y decrement
  usado en  S08
```

```
ScoreLine
  qué es    marcador en una línea, "6-3 · 6-4", con el set del ganador en negrita
  usado en  MatchCard, S07, S09, Bracket
```

```
RankingRow
  partes    posición (top 3 con Badge gold), Avatar, nombre, LevelChip sm, columnas jugados,
            ganados y % victorias (números tabulares, alineados a la derecha)
  variants  normal, yo (fondo surface-2, fijada abajo si mi fila no se ve)
  a11y      label "Puesto 3, Ana, 12 jugados, 9 ganados, 75 %"
  usado en  S10
```

```
PlayerRow
  qué es    fila de jugador para buscar y elegir compañero
  states    normal, elegido (marca accent), no disponible ("Ya inscrito", deshabilitado)
  a11y      accessibilityRole="radio" con checked cuando se elige pareja
  usado en  S16, S20
```

```
TournamentCard
  partes    nombre (heading), fecha y lugar (body-sm, text-muted), tamaño ("8 jugadores"),
            ProgressBar de parejas confirmadas, Badge de estado
  states    inscripción, en curso, terminado (con pareja campeona), cancelado
  usado en  S17
```

```
Bracket
  qué es    cuadro horizontal con scroll: una columna por ronda (Cuartos, Semifinal, Final)
  cruce     dos filas de pareja ("Ana / Luis"), ScoreLine, ganador en negrita con marca success;
            hueco sin decidir en text-muted ("Por decidir"); el campeón lleva Badge gold
  a11y      cada cruce es un label: "Semifinal 1: Ana y Luis contra Eva y Marc, 6-3 6-4,
            ganan Ana y Luis"; las rondas son cabeceras
  usado en  S21
```

```
TabBar
  pestañas  Partidos, Recientes, Ranking, Torneos, Perfil
  states    activa (icono y texto accent-text), inactiva (text-muted), con aviso (punto gold)
  tokens    fondo surface, borde superior border, alto tab-bar más el área segura
  a11y      accessibilityRole="tab" con selected
  nota      se construye con las pestañas de Expo Router en /replica-build; aquí solo su spec
```
