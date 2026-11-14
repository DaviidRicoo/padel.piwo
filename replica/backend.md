# Backend: Padel & Piwo

Supabase (Postgres, Auth, Edge Functions, pg_cron) detrás de la misma interfaz `Api` (`src/data/api.ts`) que la capa falsa. La app usa Supabase en cuanto encuentra `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Si no las encuentra, sigue con los datos de prueba en memoria (`src/data/provider.tsx`).

Fecha: 2026-11-14. Rama: `build/backend`.

## Estado

**Conectado y probado contra el proyecto real** (`app-padel-result`, eu-west-1, 2026-11-14):
- **Proyecto:** 3 migraciones aplicadas. El revisor de seguridad de Supabase solo deja los avisos intencionados (las 18 funciones que llama la app). Config de auth subida, con SMTP de Gmail y plantillas. Edge Functions desplegadas y secretos de Vault creados.
- **Registro:** registro real con código por correo, probado por el propietario. El correo llegó rápido y no fue a spam.
- **Recorridos automáticos, con datos inventados, 24 pasos:**
  - el bucle principal (12 pasos);
  - la tanda 2: perfiles, búsqueda y torneos completos (7 pasos);
  - acciones extra (5 pasos): disputar, salir, cancelar, confirmación del anfitrión, retirar pareja, cancelar torneo y borrar cuenta. El borrado elimina de verdad el acceso y anonimiza el perfil.
  - Cero errores de consola.
- **Push:** `pg_cron` llama a `send-push` cada minuto con el secreto correcto (respuestas 200) y los avisos se reparten. Ninguno ha llegado a un móvil porque falta una build con token push.
- **Encontrado y corregido en real:** la lista de torneos fallaba con `PGRST201`. `tournaments` y `tournament_pairs` están unidas por dos claves foráneas, y la consulta ahora indica cuál seguir. Los datos falsos no podían destapar este fallo.
- **Pendiente de probar en real:** recuperar contraseña (necesita un buzón real) y el traspaso de un torneo cuando su organizador borra la cuenta (probado solo en SQL).

**Escrito y probado:**
- **SQL:** el esquema, las funciones y la seguridad por filas, en `supabase/migrations/20261114000100_schema.sql`. Pasan 22 de 22 pruebas en un Postgres en memoria: `replica/tests/schema.test.mjs`.
- **Pantallas:** registro con código, recuperar contraseña con código, cerrar sesión en todos los dispositivos y borrar cuenta, sobre la capa falsa. Los dos recorridos completos (17 pasos) siguen pasando.

**Escrito pero sin probar contra un proyecto real** (falta que tú lo conectes, ver abajo):
- la capa `src/data/supabase/`;
- las Edge Functions `send-push` y `delete-user`, porque no hay Deno en este equipo;
- las tareas programadas: `supabase/migrations/20261114000200_schedules.sql`;
- las plantillas de correo y el SMTP de Gmail;
- el script de datos de prueba `scripts/seed-supabase.ts`.

## Qué hay

| pieza | archivo | qué hace |
| --- | --- | --- |
| Esquema | `supabase/migrations/20261114000100_schema.sql` | 12 tablas, seguridad por filas en todas y 18 funciones que puede llamar la app. Todas las escrituras pasan por funciones que validan en el servidor. Límites antispam: 5 partidos abiertos por anfitrión y 2 torneos en inscripción por organizador. |
| Tareas | `supabase/migrations/20261114000200_schedules.sql` | Tres tareas: recordatorio al terminar cada partido (cada 5 min), aviso al rival a las 24 h (diario) y envío de push (cada minuto, solo si hay pendientes). |
| Push | `supabase/functions/send-push` | Entrega cada aviso una sola vez (`claim_pushes`) al servicio de push de Expo, en el idioma del jugador, y borra tokens de móviles desinstalados. |
| Borrar cuenta | `supabase/functions/delete-user` | Anonimiza al jugador (`delete_account`) y borra su acceso: correo y contraseña. Lo pide Apple para apps con registro. |
| Auth | `supabase/config.toml` | Confirmación de correo obligatoria, contraseñas de 8 o más, máximo 30 correos por hora, SMTP de Gmail y plantillas propias. |
| Correos | `supabase/templates/*.html` | Confirmación, recuperación y aviso de contraseña cambiada, en español e inglés, con código de 6 cifras. |
| Cliente | `src/data/supabase/` | Sesión cifrada en el móvil (clave AES en el llavero seguro) y traducción de errores de Supabase a los códigos de la app. |
| Datos de prueba | `scripts/seed-supabase.ts` | Los mismos 12 residentes, partidos y torneos que la capa falsa. Solo para un proyecto de pruebas. |
| Variables | `.env.example` | Todas las variables, sin valores. |

**Decisiones:**
- **Códigos de 6 cifras en lugar de enlaces** en los correos: funcionan igual en Expo Go, en web y en la app instalada, sin enlaces profundos.
- **Borrar cuenta anonimiza** el perfil en lugar de eliminar sus partidos jugados, para que el ranking de los demás no cambie. El acceso (correo y contraseña) sí se borra de verdad.
- **El envío de push lo dispara `pg_cron` con un secreto propio** (`push_cron_secret`), no con la clave secreta del proyecto: `pg_net` deja las cabeceras visibles en su cola mientras envía.
- **Validación en el servidor:** son funciones SQL y restricciones de tabla, no zod. El servidor de esta app es Postgres, y ahí se comprueba todo.

## Pasos que te tocan (en orden)

Yo no creo cuentas ni escribo contraseñas o claves. Los comandos con `!` delante los escribes en esta sesión de Claude Code, para que yo vea la salida.

1. **Variables de la app.** En tu `.env.local` las variables se llaman `NEXT_PUBLIC_…`, que es el formato de Next.js, y la app no las lee. Renómbralas a `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. La segunda es la clave publicable (`sb_publishable_…`) o la `anon` antigua; nunca la `secret` ni la `service_role`.
2. **Región.** En el panel de Supabase, comprueba que el proyecto está en una región de la UE (por ejemplo Frankfurt), porque son datos de residentes de la UE. Si no lo está, créalo de nuevo allí.
3. **Gmail.** Activa la verificación en dos pasos en la cuenta que enviará los correos, y crea una contraseña de aplicación: Cuenta de Google > Seguridad > Contraseñas de aplicaciones. Crea el archivo `supabase/.env` con `SMTP_USER=tu.cuenta@gmail.com` y `SMTP_PASS=<la contraseña de aplicación>`. Ese archivo no se sube a git.
4. **Entrar en la CLI:** `! npx supabase login`. Se abre el navegador.
5. **Enlazar el proyecto:** `! npx supabase link --project-ref <ref>`. La referencia está en la URL del proyecto. Te pedirá la contraseña de la base de datos y la escribes tú.
6. **Secretos para los push.** Genera una cadena aleatoria con `! node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` y úsala en dos sitios:
   - En el SQL Editor del panel ejecuta:
     ```sql
     select vault.create_secret('https://<ref>.supabase.co', 'project_url');
     select vault.create_secret('<la cadena>', 'push_cron_secret');
     ```
   - En la terminal: `! npx supabase secrets set PUSH_CRON_SECRET=<la misma cadena>`.
7. **Avísame.** Entonces aplico y despliego:
   - `npx supabase db push`: las dos migraciones. Puede pedirte la contraseña de la base de datos.
   - `npx supabase config push`: la configuración de auth, el SMTP y las plantillas.
   - `npx supabase functions deploy send-push delete-user`.
   - Y pruebo la app contra tu proyecto.
8. **Proyecto de pruebas (recomendado).** El plan gratuito permite 2 proyectos. Usa uno de pruebas para los datos inventados (`scripts/seed-supabase.ts` con su clave secreta en tu terminal y `SEED_CONFIRM=yes`) y otro limpio para los residentes. Si solo usas uno, no ejecutes el script de datos ahí.
9. **Push en móvil, más adelante.** Los push necesitan el id de un proyecto de EAS (`npx eas-cli@latest init`) y una build de desarrollo: Expo Go no recibe push remotos en Android. Hasta entonces, los avisos se ven en la pestaña de avisos (S15).

## Lista de seguridad

- [x] **Secretos:** solo en variables de entorno.
  - `.env`, `.env*.local` y `supabase/.env` están en `.gitignore`.
  - La app solo lleva la clave publicable.
  - La clave secreta solo existe dentro de las Edge Functions, que la reciben de Supabase, y en tu terminal para el script de datos.
- [x] **Entradas validadas en el servidor:** cada escritura es una función SQL que comprueba sus datos y lanza un código de error, más las restricciones de cada tabla.
- [x] **Autorización en cada lectura y escritura:**
  - Seguridad por filas en las 12 tablas.
  - Probado con un segundo usuario: no ve avisos ni tokens de otro y no puede marcarlos como leídos. Tampoco puede editar su nivel, escribir jugadores de un partido ni crear partidos de torneo.
- [~] **Límites de frecuencia:**
  - Hechos: los de Supabase Auth (registro y entrada: 30 cada 5 min por IP; correos: 30 por hora; uno cada 60 s por persona), y los propios de partidos y torneos.
  - Falta: no hay límite propio para las invitaciones a torneo.
- [x] **Webhooks con firma:** no hay webhooks de entrada. La llamada de `pg_cron` a `send-push` lleva un secreto que la función comprueba.
- [—] **Subidas de archivos:** no hay todavía; la foto de perfil queda para más adelante. Cuando llegue: bucket propio, límite de tamaño y de tipo.
- [x] **Sin datos personales en URLs ni en registros:** las rutas solo llevan ids. Las funciones registran códigos de error, no correos.
- [~] **Dependencias auditadas (`npm audit`):**
  - Hay 8 avisos de gravedad moderada, todos de `minimatch` dentro de herramientas de compilación: `@expo/fingerprint` y `typescript-eslint`. No llegan a la app instalada.
  - `npm audit fix --force` cambiaría de versión mayor a Expo, así que no se ha aplicado. Revisarlo al actualizar el SDK.
- [ ] **Política de privacidad con todos los encargados del tratamiento:** pendiente para `/replica-launch`. Deben salir:
  - Supabase: base de datos, autenticación y funciones; región a elegir en la UE.
  - Google: Gmail, para los correos.
  - Expo: servicio de push.
  - Apple y Google: entrega de los push.

**Copias de seguridad:** el plan gratuito de Supabase no anuncia copias diarias automáticas; compruébalo en Database > Backups de tu proyecto. Mientras tanto, copia manual con `npx supabase db dump -f backup.sql` (el archivo contiene datos personales: guárdalo fuera de git).

**Pagos:** no aplica; la app no cobra.

**Integraciones:** solo el servicio de push de Expo (API pública y oficial, sin OAuth). No hay login con Google ni con Apple todavía. El día que haya login con Google, Apple exige también "Iniciar sesión con Apple".
