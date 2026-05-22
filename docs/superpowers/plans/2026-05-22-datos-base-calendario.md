# Sub-spec A — Datos base + calendario · Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poblar sedes y fechas oficiales de los 104 partidos, y añadir la página `/calendario` y una franja de próximos partidos en `/resultados`.

**Architecture:** Migración de esquema para la tabla `venues` normalizada; datos horneados en `seed.sql` (y reflejados en el mock) a partir de OpenFootball `worldcup.json` — join verificado 104/104. La UI sigue el patrón existente de la app: client components con `createClient()` + `useEffect`, sistema de diseño "Crema & Tinta 26".

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (+ capa mock), `Intl.DateTimeFormat`.

**Spec de referencia:** `docs/superpowers/specs/2026-05-22-datos-base-calendario-design.md`

**Verificación:** No hay tests automatizados (mismo criterio que el plan de rediseño). Las tareas de datos se verifican con asserts en Node; las de UI, visualmente en el navegador con `npm run dev` y `NEXT_PUBLIC_MOCK=true` en viewport móvil (~390px).

---

## Estructura de ficheros

**Crear:**
- `supabase/migrations/002_venues.sql` — tabla `venues`, `matches.venue_id`, RLS
- `src/lib/datetime.ts` — formateo en hora de España y agrupación por día
- `src/app/(app)/calendario/page.tsx` — página calendario
- `src/components/calendar/match-calendar.tsx` — agenda agrupada por día
- `src/components/calendar/calendar-day-group.tsx` — un día con sus partidos
- `src/components/calendar/calendar-match-row.tsx` — fila de un partido
- `src/components/results/upcoming-strip.tsx` — franja de próximos partidos

**Modificar:**
- `supabase/seed.sql` — `INSERT` de 16 sedes + 104 `UPDATE` de `match_date`/`venue_id`
- `src/lib/supabase/mock/data.ts` — tabla `venues`, fechas y `venue_id` reales
- `src/components/layout/navbar.tsx` — entrada "Calendario"
- `src/app/(app)/resultados/page.tsx` — montar `<UpcomingStrip>`

---

## Fase 1 · Datos

### Task 1: Migración de esquema `venues`

**Files:**
- Create: `supabase/migrations/002_venues.sql`

- [ ] **Step 1: Crear la migración**

```sql
-- ============================================================
-- 002 - Sedes (venues)
-- ============================================================

CREATE TABLE venues (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE matches ADD COLUMN venue_id INTEGER REFERENCES venues(id);
ALTER TABLE matches DROP COLUMN venue;

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venues are viewable by everyone" ON venues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage venues" ON venues
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/002_venues.sql
git commit -m "feat(db): tabla venues + matches.venue_id"
```

### Task 2: Datos de sedes y calendario en `seed.sql`

Datos generados desde OpenFootball `worldcup.json` (2026) y verificados: join 104/104,
16 sedes, distribución de partidos por sede suma 104. Las fechas se convierten a UTC
desde la hora local + offset de cada partido.

**Files:**
- Modify: `supabase/seed.sql` (añadir al final, tras los `INSERT INTO matches`)

- [ ] **Step 1: Añadir las 16 sedes**

```sql
-- ============================================================
-- VENUES (16 sedes)
-- ============================================================
INSERT INTO venues (name, city, country) VALUES
  ('Mercedes-Benz Stadium', 'Atlanta', 'Estados Unidos'),
  ('Gillette Stadium', 'Foxborough', 'Estados Unidos'),
  ('AT&T Stadium', 'Arlington', 'Estados Unidos'),
  ('Estadio Akron', 'Zapopan', 'México'),
  ('NRG Stadium', 'Houston', 'Estados Unidos'),
  ('Arrowhead Stadium', 'Kansas City', 'Estados Unidos'),
  ('SoFi Stadium', 'Inglewood', 'Estados Unidos'),
  ('Estadio Azteca', 'Ciudad de México', 'México'),
  ('Hard Rock Stadium', 'Miami Gardens', 'Estados Unidos'),
  ('Estadio BBVA', 'Guadalupe', 'México'),
  ('MetLife Stadium', 'East Rutherford', 'Estados Unidos'),
  ('Lincoln Financial Field', 'Filadelfia', 'Estados Unidos'),
  ('Levi''s Stadium', 'Santa Clara', 'Estados Unidos'),
  ('Lumen Field', 'Seattle', 'Estados Unidos'),
  ('BMO Field', 'Toronto', 'Canadá'),
  ('BC Place', 'Vancouver', 'Canadá');
```

- [ ] **Step 2: Añadir los 104 `UPDATE` de fecha + sede**

Bloque de 104 sentencias `UPDATE matches SET match_date='...', venue_id=N WHERE match_number=M;`
generado y verificado (ver `scripts/build-schedule.mjs` en el Step 3). Formato:

```sql
-- ============================================================
-- CALENDARIO OFICIAL: fecha (UTC) + sede de cada partido
-- ============================================================
UPDATE matches SET match_date='2026-06-11T19:00:00+00', venue_id=8 WHERE match_number=1;
UPDATE matches SET match_date='2026-06-12T02:00:00+00', venue_id=4 WHERE match_number=2;
-- ... (104 líneas en total)
UPDATE matches SET match_date='2026-07-19T19:00:00+00', venue_id=11 WHERE match_number=104;
```

- [ ] **Step 3: Conservar el generador**

Guardar el script generador en `scripts/build-schedule.mjs` (lee OpenFootball
`worldcup.json`, mapea sedes y equipos, convierte horas a UTC, emite el SQL). Sirve
de documentación reproducible y para Sub-spec B.

- [ ] **Step 4: Verificar**

Run: `node -e "const s=require('fs').readFileSync('supabase/seed.sql','utf8'); console.log('venues:', (s.match(/INSERT INTO venues/g)||[]).length); console.log('updates:', (s.match(/UPDATE matches SET match_date/g)||[]).length)"`
Expected: `venues: 1` y `updates: 104`

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql scripts/build-schedule.mjs
git commit -m "feat(db): sedes y calendario oficial de los 104 partidos"
```

### Task 3: Reflejar sedes y fechas en el mock

El mock (`NEXT_PUBLIC_MOCK=true`) debe espejar el esquema y los datos para poder
ver `/calendario` sin Supabase real.

**Files:**
- Modify: `src/lib/supabase/mock/data.ts`

- [ ] **Step 1: Añadir constante `VENUES` y un mapa `SCHEDULE`**

`VENUES`: array de 16 objetos `{ id, name, city, country }` (mismos datos que el Step 1
de la Task 2). `SCHEDULE`: `Record<number, { date: string; venue: number }>` con las 104
entradas (`date` en ISO UTC, `venue` = id 1..16), generado por `scripts/build-schedule.mjs`.

- [ ] **Step 2: Usar `SCHEDULE` en `buildMatches()`**

Sustituir el `match_date` sintético y `venue: null` por `match_date: SCHEDULE[num].date`
y `venue_id: SCHEDULE[num].venue` para cada partido.

- [ ] **Step 3: Exponer la tabla `venues` en el `Db`**

Añadir `venues: VENUES` al objeto de base de datos mock.

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/mock/data.ts
git commit -m "feat(mock): sedes y calendario real en datos mock"
```

## Fase 2 · Utilidad de fecha/hora

### Task 4: `src/lib/datetime.ts`

**Files:**
- Create: `src/lib/datetime.ts`

- [ ] **Step 1: Implementar las utilidades**

```ts
// Formateo de fechas de partido en hora de España (Europe/Madrid).
// Los match_date llegan en UTC; Intl gestiona el horario de verano (CEST).

const MADRID = "Europe/Madrid";

/** "19:00" — hora de inicio en España. */
export function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "Jueves 11 jun" — cabecera de día. */
export function formatMatchDay(iso: string): string {
  const s = new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Clave AAAA-MM-DD del día del partido en hora de España (para agrupar). */
export function matchDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Clave del día de hoy en hora de España. */
export function todayKey(): string {
  return matchDayKey(new Date().toISOString());
}

export interface DayGroup<T> {
  key: string;
  label: string;
  matches: T[];
}

/** Agrupa partidos por día (España), conservando el orden cronológico. */
export function groupByMatchDay<T extends { match_date: string }>(
  matches: T[]
): DayGroup<T>[] {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  );
  const groups: DayGroup<T>[] = [];
  for (const m of sorted) {
    const key = matchDayKey(m.match_date);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: formatMatchDay(m.match_date), matches: [] };
      groups.push(g);
    }
    g.matches.push(m);
  }
  return groups;
}
```

- [ ] **Step 2: Verificar la conversión horaria**

Run: `npx tsx -e "import {formatKickoff,formatMatchDay} from './src/lib/datetime'; console.log(formatKickoff('2026-06-11T19:00:00Z'), '|', formatMatchDay('2026-06-11T19:00:00Z'))"`
(o un `node` equivalente). Expected: `21:00 | Jueves 11 jun` (UTC+2 en verano).

- [ ] **Step 3: Commit**

```bash
git add src/lib/datetime.ts
git commit -m "feat: utilidades de fecha en hora de España"
```

## Fase 3 · Página `/calendario`

### Task 5: Componentes del calendario

**Files:**
- Create: `src/components/calendar/calendar-match-row.tsx`
- Create: `src/components/calendar/calendar-day-group.tsx`
- Create: `src/components/calendar/match-calendar.tsx`

- [ ] **Step 1: `calendar-match-row.tsx`**

Fila de un partido. Props: `{ match }` con `match_date`, `group_letter`, `stage`,
nombres/banderas de equipos (o `home_placeholder`/`away_placeholder`), `venue` (`name`,
`city`), `home_score`, `away_score`, `is_finished`. Estructura: hora España a la izquierda
(`formatKickoff`), banderas + nombres en el centro, marcador en `<FlapTile>` si
`is_finished`, sede (estadio · ciudad) y badge de grupo/fase debajo. Tokens del sistema
(`bg-surface`, `border-border`, `text-ink`, `font-marcador`).

- [ ] **Step 2: `calendar-day-group.tsx`**

Props: `{ group: DayGroup<Match> }`. Cabecera de día pegajosa (`sticky top-14`) con
`group.label`, y debajo las `CalendarMatchRow` del día.

- [ ] **Step 3: `match-calendar.tsx`**

Props: `{ matches }`. Aplica `groupByMatchDay`, renderiza un `CalendarDayGroup` por día.
Mantiene los filtros activos (grupo / fase) recibidos por props y filtra antes de agrupar.

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/
git commit -m "feat(calendario): componentes de agenda de partidos"
```

### Task 6: Página `/calendario`

**Files:**
- Create: `src/app/(app)/calendario/page.tsx`
- Modify: `src/components/layout/navbar.tsx`

- [ ] **Step 1: Implementar la página**

Client component (patrón de la app). `useEffect` + `createClient()`: carga `matches`
(con `match_date`, `stage`, `group_letter`, equipos, placeholders, `venue_id`, marcador),
`teams` y `venues`; ordena por `match_date`. Estado de filtros: grupo (`<GroupChips>`) y
fase (toggle grupos/eliminatorias). Botón "Hoy" que hace `scrollIntoView` al día con
`matchDayKey === todayKey()`. Renderiza `<MatchCalendar>`. Cabecera con
`<h1>` "Calendario" (estilo de `/resultados`).

- [ ] **Step 2: Añadir la entrada en la navegación**

En `navbar.tsx`, añadir a `navItems`: `{ href: "/calendario", label: "Calendario", icon: CalendarDays }` (importar `CalendarDays` de `lucide-react`). Queda nav de 5 ítems.

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev` con `NEXT_PUBLIC_MOCK=true`; abrir `/calendario` (~390px).
Expected: 104 partidos agrupados por día, hora de España, sede; filtros de grupo y
fase operativos; botón "Hoy" desplaza; los partidos 1–8 muestran marcador.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/calendario/page.tsx" src/components/layout/navbar.tsx
git commit -m "feat(calendario): página /calendario con filtros y hora de España"
```

## Fase 4 · Próximos partidos en `/resultados`

### Task 7: Franja de próximos partidos

**Files:**
- Create: `src/components/results/upcoming-strip.tsx`
- Modify: `src/app/(app)/resultados/page.tsx`

- [ ] **Step 1: `upcoming-strip.tsx`**

Props: `{ matches }` (ya cargados por la página). Filtra `!is_finished`, ordena por
`match_date`, toma los 5 primeros. Render: tira con scroll horizontal de tarjetas
compactas — hora España (`formatKickoff`), día corto (`formatMatchDay`), banderas +
códigos de equipo (o placeholder), sede (ciudad). Si no hay próximos, no renderiza nada.

- [ ] **Step 2: Cargar fechas y sedes en `resultados/page.tsx`**

Ampliar la query de `matches` con `match_date` y `venue_id`; cargar también `venues`.
Añadir `match_date`/`venue` a las estructuras de datos según haga falta.

- [ ] **Step 3: Montar `<UpcomingStrip>`**

Renderizar `<UpcomingStrip matches={...} />` tras `<TuJornadaCard>` y antes del
conmutador de sub-tabs, con un rótulo "Próximos partidos".

- [ ] **Step 4: Verificar visualmente**

Run: `npm run dev` con `NEXT_PUBLIC_MOCK=true`; abrir `/resultados`.
Expected: franja con los próximos 5 partidos sin jugar, con hora de España y sede.

- [ ] **Step 5: Commit**

```bash
git add src/components/results/upcoming-strip.tsx "src/app/(app)/resultados/page.tsx"
git commit -m "feat(resultados): franja de próximos partidos"
```

## Fase 5 · Cierre

### Task 8: Limpieza y verificación final

- [ ] **Step 1: Eliminar ficheros temporales**

Borrar de la raíz cualquier artefacto temporal del generador (`owc.json`, `*.mjs`
sueltos, `out-*`, `join-result.json`, `bash.exe.stackdump`, `tsc-output.txt`). El
generador definitivo vive en `scripts/build-schedule.mjs`.

- [ ] **Step 2: Build completo**

Run: `npm run build`
Expected: build correcto, sin errores de tipos.

- [ ] **Step 3: Repaso visual**

`/calendario` y `/resultados` en móvil; navegación de 5 ítems correcta.

- [ ] **Step 4: Commit final si queda algo pendiente**

```bash
git add -A
git commit -m "chore: limpieza Sub-spec A"
```

---

## Self-review (cobertura del spec)

- Esquema `venues` + `matches.venue_id`, drop `venue` → Task 1.
- Sedes + fechas oficiales en `seed.sql` → Task 2.
- Mock reflejado → Task 3.
- Hora de España (`Europe/Madrid`, CEST) → Task 4.
- Página `/calendario` con agenda día a día, filtros grupo/fase, botón "Hoy" → Tasks 5–6.
- Entrada de navegación → Task 6.
- Franja de próximos en `/resultados` → Task 7.
- Funciona en mock y con Supabase real; verificación visual → Tasks 6–8.
