# Sub-spec A — Datos base: import + calendario

**Fecha:** 2026-05-22
**Rama:** `datos-mundial`
**Estado:** Diseño aprobado · pendiente de plan de implementación

---

## 1. Contexto: el proyecto "Datos del Mundial"

La PWA "Porra del Mundial 2026" (app privada de quiniela para "los noeles") va a
incorporar datos reales del torneo: resultados en vivo, calendario, sedes y
selecciones. Es un proyecto grande, así que se descompone en **cuatro sub-specs**,
cada uno con su propio ciclo spec → plan → implementación:

| Sub-spec | Contenido | Depende de |
|---|---|---|
| **A** *(este doc)* | Datos base: import de sedes/fechas + calendario | — |
| B | Pipeline en vivo (API-Football → cron → Supabase) + puntuación automática | A |
| C | Match Center: tarjeta "en vivo", clasificación en tiempo real, "partido del día" | B |
| D | Páginas de selección: plantilla, forma, ranking, enlaces | A (UI en paralelo) |

**Fechas que mandan:** hoy 22 may → A se puede hacer ya · 2 jun → convocatorias
oficiales (datos de D) · 11 jun → arranca el Mundial (B y C deben estar listos).

## 2. Decisiones tomadas (afectan a todos los sub-specs)

- **Fuente de resultados en vivo (Sub-spec B):** API-Football (plan gratuito,
  100 req/día) como fuente principal, con **fallback manual** — el admin sigue
  pudiendo meter resultados a mano en `/admin/resultados` si la API falla o se
  agota la cuota.
- **Sedes:** tabla `venues` **mínima** (nombre, ciudad, país), normalizada.
- **Calendario:** página propia `/calendario` **+** una franja "próximos
  partidos" dentro de `/resultados`.
- **Zona horaria:** todas las horas se muestran en **hora de España**
  (`Europe/Madrid`). Los `match_date` se guardan en UTC (`TIMESTAMPTZ`).

## 3. Alcance del Sub-spec A

1. **Datos:** poblar las 16 sedes y vincular cada uno de los 104 partidos a su
   sede; verificar y corregir las fechas/horas oficiales de los partidos.
2. **Calendario:** página `/calendario` con agenda día a día de los 104 partidos.
3. **Resultados:** franja "próximos partidos" en `/resultados`.

Estado de partida: `supabase/seed.sql` ya siembra los 104 partidos con
`match_number`, fase, grupos, equipos y placeholders de eliminatoria correctos.
Lo que falta es la **sede** (vacía en los 104) y **verificar las fechas** (las
actuales parecen aproximadas — varios partidos del mismo grupo a la misma hora).

## 4. Enfoque: datos horneados en SQL

El calendario y las sedes son **estáticos y ya conocidos** (el sorteo fue en
diciembre de 2025). No se construye infraestructura de import en runtime: durante
la implementación se obtiene una vez [OpenFootball `worldcup.json`](https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json)
— que trae fecha, hora y `ground` exactos de los 104 partidos — y se genera el
SQL de las sedes y las fechas/`venue_id` corregidas. Queda horneado en `seed.sql`
y en el mock data.

**Descartado:** script de import en runtime o página admin de import. Añaden
complejidad y dependen de acceso a Supabase (no disponible aún) para datos que
no cambian nunca.

## 5. Diseño detallado

### 5.1 Esquema y datos

**Migración `supabase/migrations/002_venues.sql`** (solo esquema):

- `CREATE TABLE venues (id SERIAL PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT
  NULL, country TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`.
- `ALTER TABLE matches ADD COLUMN venue_id INTEGER REFERENCES venues(id)`.
- `ALTER TABLE matches DROP COLUMN venue` — el `venue TEXT` actual está vacío y
  sin usar; se sustituye por la relación normalizada.
- RLS: habilitar en `venues` con política de lectura pública para `authenticated`
  (mismo patrón que `teams`).

**`supabase/seed.sql`** (datos):

- Añadir `INSERT INTO venues` con los 16 estadios oficiales.
- Modificar los `INSERT INTO matches` existentes para incluir `venue_id` y
  corregir `match_date` con las horas oficiales obtenidas de OpenFootball.

**`src/lib/supabase/mock/data.ts`** (mock — imprescindible para ver `/calendario`
sin Supabase real):

- Añadir array `VENUES` y exponer la tabla `venues` en el objeto `Db`.
- En `buildMatches()`: asignar `venue_id` a cada partido y usar las fechas reales
  en vez de las sintéticas; eliminar el campo `venue: null`.

### 5.2 Página `/calendario`

- Nueva ruta dentro del grupo `(app)`, Server Component.
- Query: `matches` con join a `teams` (local y visitante) y a `venues`, ordenado
  por `match_date` ascendente.
- **Agenda día a día:** los partidos se agrupan por fecha; cada día tiene una
  cabecera ("Jueves 11 jun") y debajo sus partidos.
- **Por partido:** hora de España, badge de grupo/fase, banderas + nombres de los
  equipos (o el texto placeholder en eliminatorias: `2A`, `W74`...), sede
  (estadio · ciudad), y marcador en fichas split-flap si `is_finished`.
- **Filtros:** `<GroupChips>` (grupos A–L) + toggle fase grupos/eliminatorias.
  Botón "Hoy" que desplaza a la fecha actual.
- Reutiliza `<MatchCard>` del sistema de rediseño.

### 5.3 Franja "próximos partidos" en `/resultados`

- Bloque en la parte superior de `/resultados`: los ~5 partidos siguientes sin
  jugar, en orden cronológico, con hora de España y sede.
- Componente nuevo `<UpcomingStrip>` (lista compacta con scroll horizontal).

### 5.4 Componentes y utilidades

- **Nuevos:** `<MatchCalendar>` (agenda agrupada por día), `<UpcomingStrip>`.
- **Util nuevo `src/lib/datetime.ts`:** `formatInMadrid(date)` y
  `groupByMatchDay(matches)`. Usa `Intl.DateTimeFormat` con
  `timeZone: 'Europe/Madrid'` — gestiona solo el horario de verano (CEST, UTC+2
  en junio/julio).
- **Reutiliza:** `<MatchCard>`, `<GroupChips>`, `<FlapTile>` del rediseño. Si
  alguno aún no existe en la rama, A crea la versión mínima necesaria.

### 5.5 Navegación

- Añadir entrada "Calendario" en `src/components/layout/navbar.tsx`.

## 6. Fuera de alcance

- Resultados en vivo, cron de Vercel, integración con API-Football → **Sub-spec B**.
- Cálculo automático de puntuación → **Sub-spec B**.
- Tarjeta de partido "en vivo", clasificación en tiempo real → **Sub-spec C**.
- Páginas de selección, plantillas, forma, ranking → **Sub-spec D**.

## 7. Criterios de verificación

- `/calendario` muestra los 104 partidos agrupados por día, con hora de España y
  sede en cada uno.
- Los filtros por grupo y por fase funcionan; el botón "Hoy" desplaza a la fecha
  actual.
- `/resultados` muestra la franja de próximos partidos en su parte superior.
- Todo funciona tanto con `NEXT_PUBLIC_MOCK=true` (mock data) como contra
  Supabase real.
- Las fechas/horas mostradas coinciden con el calendario oficial de la FIFA.

## 8. Fuentes de datos

- **Calendario, fechas y sedes:** [OpenFootball `worldcup.json` (2026)](https://github.com/openfootball/worldcup.json)
  — dominio público, sin API key.
- Verificación cruzada: [FIFA — Scores & Fixtures](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures).
