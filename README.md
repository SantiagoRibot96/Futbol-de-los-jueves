# Futbol de los jueves

Web para llevar la tabla de posiciones del torneo amistoso: jugadores, partidos
por fecha (dos equipos + resultado), tabla de posiciones, resultado de cada uno
en las ultimas 3 fechas de la temporada (`--` si no jugo esa fecha) y tabla de
promedios. Reemplaza la planilla de Excel del grupo.

## Stack

- **Next.js 16** (App Router, TypeScript) — nativo de Vercel.
- **Tailwind CSS v4** para los estilos.
- **PostgreSQL** vía **Prisma ORM 7** (con el driver adapter `@prisma/adapter-pg`,
  sin binario nativo, ideal para funciones serverless de Vercel).
  - Produccion: Neon (integracion "Postgres" de Vercel).
  - Desarrollo local: `npx prisma dev`, que levanta un Postgres local sin
    necesidad de Docker ni de crear ninguna cuenta.
- **jose** para firmar la cookie de sesion (JWT) y **bcryptjs** para las claves.
- Sin librería de autenticación: son solo 2 cuentas fijas (admin / jugador), no
  hay alta de usuarios, así que un login casero de ~80 líneas alcanza.

Los puntos, partidos jugados, promedios, etc. **no se guardan en la base** —
se calculan al vuelo a partir de los partidos cargados (ver
[src/lib/stats.ts](src/lib/stats.ts)). Así no hay manera de que un contador
quede desincronizado del historial real de partidos.

## Modelo de datos

- **Season**: una temporada (ej. "Clausura 2026"). Solo una activa a la vez.
  Puede marcarse `isLegacy` (ver mas abajo).
- **Player**: el plantel. Global, no depende de la temporada.
- **Match**: una fecha jugada — temporada, fecha calendario y resultado
  (`A`, `B` o `DRAW`).
- **MatchPlayer**: qué jugador jugó en qué equipo (`A`/`B`) en cada partido.
- **LegacyStanding**: tabla final "congelada" de una temporada `isLegacy`
  (jugador, puntos, PJ, PG, PP, PE ya calculados, sin partidos detras). Se usa
  para temporadas viejas que llevaban otro sistema de puntos y que solo
  quedan a modo de consulta — no se pueden cargar partidos nuevos ahi.

## Desarrollo local

```bash
npm install
npx prisma dev --detach      # levanta Postgres local en segundo plano
cp .env.example .env         # y completá los valores (ver mas abajo)
npx prisma db push           # crea las tablas (ver nota abajo)
npm run dev
```

Para bajar la base local cuando termines: `npx prisma dev stop`.

**Nota sobre migraciones:** en este repo no hay carpeta `prisma/migrations` —
el "shadow database" que usa `prisma migrate dev` contra el Postgres local de
`prisma dev` quedó en un estado inconsistente durante el desarrollo (error
`type "MatchResult" already exists`) y `db push` lo evita por completo (no la
necesita). Para uso diario local, `db push` alcanza. La primera vez que
conectes una base de Neon real (production), como es una base nueva sin ese
problema, ahí sí conviene generar las migraciones de una: `npx prisma migrate
dev --name init` (ver paso 4 de deploy).

### Generar las claves de admin/jugador

```bash
node -e "console.log(require('bcryptjs').hashSync('LA_CLAVE_QUE_QUIERAS', 10))"
```

Copiá el resultado a `ADMIN_PASSWORD_HASH` o `PLAYER_PASSWORD_HASH` en `.env`.

**Importante:** el hash empieza con `$2b$10$...`. Next.js interpreta `$algo`
dentro de un archivo `.env` como si fuera una variable a reemplazar, así que
**dentro de `.env` (y solo ahí)** cada `$` del hash tiene que escaparse como
`\$`, por ejemplo:

```
ADMIN_PASSWORD_HASH="\$2b\$10\$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Si te olvidás de escaparlo, el login falla silenciosamente ("usuario o clave
incorrectos" aunque estén bien) — ya me pasó armando esto. En el dashboard de
Vercel **NO hay que escapar nada**, ahí se pega el hash tal cual sale de bcrypt
(esa pantalla no pasa por el parser de `.env`).

### Datos historicos

El repo ya incluye `prisma/seed.ts` con 4 temporadas reconstruidas de tus
planillas de Excel, cada una validada contra los totales de Pto/PJ/PG/PP/PE
que ya tenías ahí:

- **Clausura 2026** (activa): 8 fechas, 14 jugadores. Coincide 100%.
- **Apertura 2026**: 11 fechas. El resto de la temporada quedó como `#REF!`
  en la planilla (formula rota) y confirmaste que no hay forma de recuperar
  esos resultados, así que se omiten — los totales de esta temporada en la
  app van a ser mas bajos que los de la planilla original.
- **Clausura 2025**: 24 fechas, 17 jugadores. Coincide 100%.
- **Apertura 2025**: llevaba otro sistema de puntos (Gana 3 / Empata 2 /
  Pierde 1, no 3/1/0). Por eso se importa como tabla "congelada"
  (`Season.isLegacy`) con los valores finales tal cual estaban en la
  planilla, solo a modo de consulta — no se le pueden cargar partidos nuevos.

Los jugadores que no son del plantel actual (invitados de una sola fecha,
gente de temporadas viejas) quedan cargados pero marcados inactivos, para que
no aparezcan al elegir equipos en `/admin/matches`. Podés reactivarlos desde
`/admin/players` si vuelven a jugar.

**Nombres duplicados:** algunos apodos se escribían distinto entre planillas
(ej. "Heladio" vs "Hela", "Santi (timo)" vs "Santi(Timo)" vs "Santiago
(timo)") — se importaron tal cual estaban en cada una, así que quedaron como
jugadores separados en vez de fusionarse. Si son la misma persona y querés
unificarlos, decime y lo ajusto (por ahora no hay una función de "fusionar
jugador" en el admin).

Para cargar todo esto en tu base:

```bash
npx prisma db seed
```

## Deploy en Vercel + Neon (base creada a mano)

Este proyecto usa una base de Neon creada directamente en neon.tech, no la
integracion "Postgres" del marketplace de Vercel — por eso hay que copiar las
connection strings a mano.

1. **Creá el proyecto en Neon** (neon.tech, si todavia no lo hiciste) y andá a
   *Connection Details*. Neon te da dos connection strings distintas para la
   misma base:
   - **Pooled** (host termina en `-pooler.<region>.aws.neon.tech`): la que va
     a usar la app en runtime, en Vercel.
   - **Direct** (mismo host sin `-pooler`): usala solo para correr
     migraciones — evita problemas del connection pooler con el DDL.

   Ambas ya traen `sslmode=require`, no hay que tocarlas.

2. **Migrá la base de Neon desde tu máquina**, pasándole la connection string
   **directa** como `DATABASE_URL` (una sola vez; como es una base nueva,
   `migrate dev` genera `prisma/migrations` de una sin el problema del shadow
   database que tuvimos en local):
   ```bash
   DATABASE_URL="postgresql://...directa (sin -pooler)...neon.tech/..." \
   npx prisma migrate dev --name init

   # opcional, carga las 4 temporadas de historial:
   DATABASE_URL="postgresql://...directa (sin -pooler)...neon.tech/..." \
   npx prisma db seed
   ```
   Commiteá y pusheá la carpeta `prisma/migrations` que se generó — sin eso,
   el repo no tiene forma de recrear el esquema en otra base.

3. **Creá el proyecto en Vercel** importando este repo de GitHub
   (`SantiagoRibot96/Futbol-de-los-jueves`).

4. **Variables de entorno** (Vercel → Settings → Environment Variables, en
   Production — y en Preview/Development si vas a usar esos ambientes):
   - `DATABASE_URL`: la connection string **pooled** de Neon (la directa es
     solo para cuando corras migraciones a mano desde tu máquina, no hace
     falta cargarla en Vercel).
   - `SESSION_SECRET`: una tira random larga (ej. `openssl rand -hex 32`).
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `PLAYER_USERNAME`,
     `PLAYER_PASSWORD_HASH`: los hashes se pegan **sin** escapar el `$`, a
     diferencia del `.env` local (esa pantalla no pasa por el parser de
     `.env` de Next.js).

5. **Deploy**. El script `postinstall` corre `prisma generate`
   automáticamente en cada build de Vercel, así que con pushear a `main`
   (o darle "Deploy" desde el dashboard) alcanza.

Para el día que cambies el schema (`prisma/schema.prisma`), el flujo es:
correr `DATABASE_URL="...directa..." npx prisma migrate dev --name <lo que sea>`
apuntando a Neon, commitear la migración nueva, y pushear — Vercel no corre
migraciones solo, así que hacé esto antes de que el código nuevo llegue a
producción si el cambio de schema es incompatible con el código viejo.

## Estructura

```
prisma/schema.prisma, prisma/seed.ts
src/proxy.ts                    -> protege todas las rutas salvo /login
src/lib/{auth,session,db,stats}.ts
src/app/{login,admin/players,admin/matches,admin/seasons}/page.tsx
src/app/page.tsx                -> Tabla + Promedios
src/app/actions/{auth,players,matches,seasons}.ts
```
