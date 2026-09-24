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

## Deploy en Vercel

Esta parte requiere que crees vos las cuentas (no puedo hacerlo por vos):

1. **Subí el repo a GitHub** y creá un proyecto nuevo en Vercel importándolo.
2. **Agregá una base Postgres**: en el proyecto de Vercel, pestaña *Storage* →
   *Create Database* → Postgres (Neon). Esto define `DATABASE_URL`
   automáticamente en las variables de entorno del proyecto.
3. **Variables de entorno** (Vercel → Settings → Environment Variables):
   `SESSION_SECRET` (una tira random larga), `ADMIN_USERNAME`,
   `ADMIN_PASSWORD_HASH`, `PLAYER_USERNAME`, `PLAYER_PASSWORD_HASH` (los hashes
   se pegan **sin** escapar el `$`, a diferencia del `.env` local).
4. **Migrar la base de producción** (una sola vez, desde tu máquina, apuntando
   al `DATABASE_URL` de Neon que copiaste de Vercel — como es una base nueva,
   `migrate dev` le crea la carpeta `prisma/migrations` de una sin problemas):
   ```bash
   DATABASE_URL="postgresql://...neon..." npx prisma migrate dev --name init
   DATABASE_URL="postgresql://...neon..." npx prisma db seed   # opcional, carga el historial
   ```
   Después de esto, sí conviene commitear la carpeta `prisma/migrations`
   generada para que quede el historial versionado.
5. **Deploy**. El script `postinstall` corre `prisma generate` automáticamente
   en cada build de Vercel, así que no hace falta nada más.

## Estructura

```
prisma/schema.prisma, prisma/seed.ts
src/proxy.ts                    -> protege todas las rutas salvo /login
src/lib/{auth,session,db,stats}.ts
src/app/{login,admin/players,admin/matches,admin/seasons}/page.tsx
src/app/page.tsx                -> Tabla + Promedios
src/app/actions/{auth,players,matches,seasons}.ts
```
