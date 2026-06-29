# Cuadro real, puntuación por enfrentamiento y visualización — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rellenar el cuadro real desde resultados de grupos en admin, puntuar los resultados de cruce por enfrentamiento (mismo par, misma ronda, sin depender del slot) y mostrar el cruce real frente a la predicción del usuario en las secciones de la porra.

**Architecture:** La lógica pura (emparejado por par, normalización local/visitante, siembra y cascada del cuadro real, comparación para la UI) vive en `src/lib/` y se prueba con `node:test`. El admin y las páginas de resultados/eliminatorias consumen esas funciones. Se reutiliza al máximo lo existente: `populateKnockoutBracket`, `calculateGroupStandings`, `getBestThirds`, `buildRealGroupStandings`, `didPredictTeamInStage`/`didPredictTeamWinStage`.

**Tech Stack:** Next.js (App Router, client components), TypeScript, Supabase JS, tests con `node:test` ejecutados vía `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-06-29-knockout-bracket-real-scoring-design.md`

**Comando de tests del proyecto:** `npx tsx --test <ruta-al-test>` (no existe script `test` en package.json; los `.test.ts` usan imports sin extensión, que Node nativo no resuelve — `tsx` sí).

**Typecheck:** `npx tsc --noEmit`

---

## File structure

| Archivo | Responsabilidad | Acción |
|---------|-----------------|--------|
| `src/lib/scoring/knockout.ts` | Emparejado por par + acierto exacto normalizado + scorer | Reescribir |
| `src/lib/scoring/knockout.test.ts` | Tests del scorer knockout | Reescribir |
| `src/lib/scoring/calculator.ts` | Orquestador de puntuación | Modificar (wiring) |
| `src/lib/tournament/actual-bracket.ts` | Siembra R32 + cascada del cuadro **real** | Crear |
| `src/lib/tournament/actual-bracket.test.ts` | Tests de siembra/cascada | Crear |
| `src/lib/results/knockout-comparison.ts` | Construir cuadro de un usuario + comparar con partido real (para UI) | Crear |
| `src/lib/results/knockout-comparison.test.ts` | Tests de comparación | Crear |
| `src/lib/scoring/qualification.test.ts` | Test "clasificado por cualquier rama" (#4) | Modificar |
| `src/app/(admin)/admin/resultados/page.tsx` | Generar cuadro real, selector de equipo, auto-avance | Modificar |
| `src/components/results/knockout-bracket-results.tsx` | Render del cuadro real vs predicción | Crear |
| `src/app/(app)/resultados/page.tsx` | Pestaña "Cuadro" + badges de clasificado en "Grupos" | Modificar |
| `src/app/(app)/predicciones/eliminatorias/page.tsx` | Overlay de resultado real en vista Cuadro | Modificar |

---

## Task 1: Emparejado por par y acierto exacto normalizado (lógica pura)

**Files:**
- Modify: `src/lib/scoring/knockout.ts`
- Test: `src/lib/scoring/knockout.test.ts`

- [ ] **Step 1: Reescribir el test con los nuevos casos**

Reemplaza TODO el contenido de `src/lib/scoring/knockout.test.ts` por:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { findUserPredictionForPairing, isKnockoutPairingExact } from "./knockout";
import type { PredictedKnockoutMatch } from "./qualification";

test("acierto exacto suma con el mismo par aunque cambie local/visitante", () => {
  // Real: 1 (local) 2-1 2 (visitante). Usuario lo puso al revés: 2 (local) 1-2 1 (visitante)
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
      predicted: { home_team_id: 2, away_team_id: 1, home_score: 1, away_score: 2 },
    }),
    true
  );
});

test("acierto exacto con misma orientación", () => {
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
      predicted: { home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 1 },
    }),
    true
  );
});

test("par distinto no suma", () => {
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
      predicted: { home_team_id: 3, away_team_id: 4, home_score: 2, away_score: 1 },
    }),
    false
  );
});

test("par correcto pero marcador distinto no suma", () => {
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
      predicted: { home_team_id: 1, away_team_id: 2, home_score: 3, away_score: 0 },
    }),
    false
  );
});

test("empate exige ganador por penaltis por equipo (no por lado)", () => {
  // Real: empate 1-1, gana por penaltis el equipo 1 (que es local)
  // Usuario: puso el par al revés y ganador por penaltis "away" = equipo 1 → debe contar
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1, penaltyWinner: "home" },
      predicted: { home_team_id: 2, away_team_id: 1, home_score: 1, away_score: 1, penalty_winner: "away" },
    }),
    true
  );
  // Distinto ganador por penaltis no cuenta
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1, penaltyWinner: "home" },
      predicted: { home_team_id: 1, away_team_id: 2, home_score: 1, away_score: 1, penalty_winner: "away" },
    }),
    false
  );
});

test("findUserPredictionForPairing encuentra el par en la misma ronda en otro slot", () => {
  const bracket = new Map<number, PredictedKnockoutMatch>([
    [73, { home_team_id: 10, away_team_id: 20, home_score: 1, away_score: 0 }],
    [80, { home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 1 }],
  ]);
  const stageByMatchNumber = new Map<number, string>([
    [73, "round_of_32"],
    [80, "round_of_32"],
  ]);
  const found = findUserPredictionForPairing(bracket, stageByMatchNumber, "round_of_32", 2, 1);
  assert.equal(found?.home_team_id, 1);
  assert.equal(found?.away_team_id, 2);
});

test("findUserPredictionForPairing no cruza de ronda", () => {
  const bracket = new Map<number, PredictedKnockoutMatch>([
    [80, { home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 1 }],
  ]);
  const stageByMatchNumber = new Map<number, string>([[80, "round_of_32"]]);
  assert.equal(findUserPredictionForPairing(bracket, stageByMatchNumber, "round_of_16", 1, 2), null);
});

test("findUserPredictionForPairing requiere los dos equipos", () => {
  const bracket = new Map<number, PredictedKnockoutMatch>([
    [80, { home_team_id: 1, away_team_id: 99, home_score: 2, away_score: 1 }],
  ]);
  const stageByMatchNumber = new Map<number, string>([[80, "round_of_32"]]);
  assert.equal(findUserPredictionForPairing(bracket, stageByMatchNumber, "round_of_32", 1, 2), null);
});
```

- [ ] **Step 2: Ejecutar el test y ver que falla**

Run: `npx tsx --test src/lib/scoring/knockout.test.ts`
Expected: FAIL (no existen `findUserPredictionForPairing` ni `isKnockoutPairingExact`).

- [ ] **Step 3: Reescribir `src/lib/scoring/knockout.ts`**

Reemplaza TODO el contenido por:

```ts
import type { PredictedKnockoutMatch } from "./qualification";

interface ScoreEvent {
  user_id: string;
  match_id: number;
  rule_key: string;
  points: number;
  description: string;
}

const STAGE_RULE_MAP: Record<string, string> = {
  round_of_32: "exact_r32",
  round_of_16: "exact_r16",
  quarter_final: "exact_qf",
  semi_final: "exact_sf",
  third_place: "exact_third",
  final: "exact_final",
};

const STAGE_LABEL: Record<string, string> = {
  round_of_32: "Dieciseisavos",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinales",
  third_place: "3er/4to",
  final: "Final",
};

type Side = "home" | "away";

// Busca en el cuadro del usuario el partido de la MISMA ronda donde aparezcan
// los dos equipos del cruce real (en cualquier slot/orientación). Como el cuadro
// es un árbol, cada equipo aparece como máximo una vez por ronda.
export function findUserPredictionForPairing(
  userBracket: Map<number, PredictedKnockoutMatch>,
  stageByMatchNumber: Map<number, string>,
  stage: string,
  teamA: number,
  teamB: number
): PredictedKnockoutMatch | null {
  for (const [matchNumber, predicted] of Array.from(userBracket.entries())) {
    if (stageByMatchNumber.get(matchNumber) !== stage) continue;
    const home = predicted.home_team_id;
    const away = predicted.away_team_id;
    if (home === undefined || away === undefined) continue;
    if ((home === teamA && away === teamB) || (home === teamB && away === teamA)) {
      return predicted;
    }
  }
  return null;
}

interface KnockoutPairingInput {
  actual: {
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number;
    awayScore: number;
    penaltyWinner?: Side | null;
  };
  predicted: PredictedKnockoutMatch;
}

// Acierto exacto normalizado por equipo: compara los goles que el usuario asignó
// a CADA equipo contra los goles reales de ese equipo, sin importar si en su
// cuadro el equipo era local o visitante. En empate, exige acertar el ganador
// por penaltis comparando por equipo (no por lado).
export function isKnockoutPairingExact({ actual, predicted }: KnockoutPairingInput): boolean {
  const predHome = predicted.home_team_id;
  const predAway = predicted.away_team_id;
  const predHomeScore = predicted.home_score;
  const predAwayScore = predicted.away_score;
  if (predHome === undefined || predAway === undefined) return false;
  if (predHomeScore === undefined || predAwayScore === undefined) return false;

  const samePairing =
    (predHome === actual.homeTeamId && predAway === actual.awayTeamId) ||
    (predHome === actual.awayTeamId && predAway === actual.homeTeamId);
  if (!samePairing) return false;

  const predGoalsForActualHome = predHome === actual.homeTeamId ? predHomeScore : predAwayScore;
  const predGoalsForActualAway = predHome === actual.homeTeamId ? predAwayScore : predHomeScore;
  if (predGoalsForActualHome !== actual.homeScore || predGoalsForActualAway !== actual.awayScore) {
    return false;
  }

  if (actual.homeScore === actual.awayScore) {
    const predWinnerTeam =
      predicted.penalty_winner === "home"
        ? predHome
        : predicted.penalty_winner === "away"
          ? predAway
          : undefined;
    const actualWinnerTeam =
      actual.penaltyWinner === "home"
        ? actual.homeTeamId
        : actual.penaltyWinner === "away"
          ? actual.awayTeamId
          : undefined;
    return predWinnerTeam !== undefined && predWinnerTeam === actualWinnerTeam;
  }

  return true;
}

// Puntúa un partido real de eliminatoria para todos los usuarios, emparejando
// por par de equipos dentro de la misma ronda (no por slot del cuadro).
export function scoreKnockoutExact(
  match: {
    id: number;
    match_number: number;
    stage: string;
    home_score: number;
    away_score: number;
    penalty_winner_team_id?: number | null;
    home_team_id: number;
    away_team_id: number;
  },
  rules: Map<string, number>,
  predictedMatchesByUser: Map<string, Map<number, PredictedKnockoutMatch>>,
  stageByMatchNumber: Map<number, string>
): ScoreEvent[] {
  const events: ScoreEvent[] = [];
  const ruleKey = STAGE_RULE_MAP[match.stage];
  if (!ruleKey) return events;
  const pts = rules.get(ruleKey) || 0;
  if (pts <= 0) return events;

  const actual = {
    homeTeamId: match.home_team_id,
    awayTeamId: match.away_team_id,
    homeScore: match.home_score,
    awayScore: match.away_score,
    penaltyWinner:
      match.penalty_winner_team_id === match.home_team_id
        ? ("home" as Side)
        : match.penalty_winner_team_id === match.away_team_id
          ? ("away" as Side)
          : null,
  };

  for (const [userId, userBracket] of Array.from(predictedMatchesByUser.entries())) {
    const predicted = findUserPredictionForPairing(
      userBracket,
      stageByMatchNumber,
      match.stage,
      match.home_team_id,
      match.away_team_id
    );
    if (!predicted) continue;
    if (isKnockoutPairingExact({ actual, predicted })) {
      events.push({
        user_id: userId,
        match_id: match.id,
        rule_key: ruleKey,
        points: pts,
        description: `Exacto ${match.home_score}-${match.away_score} en ${STAGE_LABEL[match.stage]} P${match.match_number}`,
      });
    }
  }

  return events;
}
```

- [ ] **Step 4: Ejecutar el test y ver que pasa**

Run: `npx tsx --test src/lib/scoring/knockout.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring/knockout.ts src/lib/scoring/knockout.test.ts
git commit -m "feat(scoring): puntuar cruces por par de equipos en la misma ronda"
```

---

## Task 2: Wiring del scorer en el calculador

**Files:**
- Modify: `src/lib/scoring/calculator.ts`

`scoreKnockoutExact` ya no es `async` ni recibe `supabase`; ahora recibe `stageByMatchNumber`. Hay que ajustar el orquestador.

- [ ] **Step 1: Construir `stageByMatchNumber` y pasarlo**

En `recalculateAllScores`, justo después de crear `predictedMatchesByUser` (tras la línea `const predictedMatchesByUser = await buildPredictedKnockoutMatchesByUser(...)`), añade:

```ts
    const stageByMatchNumber = new Map<number, string>();
    for (const m of knockoutMatchesForPredictions || []) {
      stageByMatchNumber.set(m.match_number, m.stage);
    }
```

- [ ] **Step 2: Pasar el mapa al scorer en `categoryScorers`**

Cambia la línea:

```ts
      knockout_exact: () => scoreKnockoutExactScores(supabase, rules, predictedMatchesByUser),
```

por:

```ts
      knockout_exact: () => scoreKnockoutExactScores(supabase, rules, predictedMatchesByUser, stageByMatchNumber),
```

- [ ] **Step 3: Actualizar `scoreKnockoutExactScores`**

Reemplaza la función `scoreKnockoutExactScores` completa por:

```ts
async function scoreKnockoutExactScores(
  supabase: SupabaseClient,
  rules: Map<string, number>,
  predictedMatchesByUser: Map<string, Map<number, PredictedKnockoutMatch>>,
  stageByMatchNumber: Map<number, string>
): Promise<ScoreEvent[]> {
  const events: ScoreEvent[] = [];
  const { data: knockoutMatches } = await supabase.from("matches").select("*").neq("stage", "group").eq("is_finished", true);
  for (const match of knockoutMatches || []) {
    if (!match.home_team_id || !match.away_team_id || match.home_score === null || match.away_score === null) continue;
    events.push(...scoreKnockoutExact(match, rules, predictedMatchesByUser, stageByMatchNumber));
  }
  return events;
}
```

(El `import { scoreKnockoutExact } from "./knockout";` ya existe en la cabecera; no se toca.)

- [ ] **Step 4: Typecheck y test de no-regresión del calculador**

Run: `npx tsc --noEmit`
Expected: sin errores.

Run: `npx tsx --test src/lib/scoring/calculator.test.ts`
Expected: PASS (sin regresiones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring/calculator.ts
git commit -m "refactor(scoring): pasar stageByMatchNumber al scorer de cruces"
```

---

## Task 3: Siembra y cascada del cuadro real (lógica pura)

**Files:**
- Create: `src/lib/tournament/actual-bracket.ts`
- Test: `src/lib/tournament/actual-bracket.test.ts`

- [ ] **Step 1: Escribir el test**

Crea `src/lib/tournament/actual-bracket.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { seedRound32FromGroups, cascadeKnockoutWinners } from "./actual-bracket";
import { calculateGroupStandings } from "./standings";

// Grupo A: equipo 1 gana ambos (1º), equipo 2 segundo. Grupo B: equipo 3 (1º), equipo 4 (2º).
function standings() {
  const a = calculateGroupStandings([1, 2], [
    { home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 0 },
  ]);
  const b = calculateGroupStandings([3, 4], [
    { home_team_id: 3, away_team_id: 4, home_score: 1, away_score: 0 },
  ]);
  return new Map([
    ["A", a],
    ["B", b],
  ]);
}

const positions = [
  { match_number: 73, slot: "home" as const, source_type: "group_winner", source_group: "A" },
  { match_number: 73, slot: "away" as const, source_type: "group_runner_up", source_group: "B" },
  { match_number: 89, slot: "home" as const, source_type: "match_winner", source_match_number: 73 },
];

test("seedRound32FromGroups rellena slots vacíos de R32 desde los grupos", () => {
  const matches = [
    { match_number: 73, stage: "round_of_32", home_team_id: null, away_team_id: null },
    { match_number: 89, stage: "round_of_16", home_team_id: null, away_team_id: null },
  ];
  const assignments = seedRound32FromGroups(standings(), matches, positions);
  // 1º de A = equipo 1 (home de 73); 2º de B = equipo 4 (away de 73)
  assert.deepEqual(
    assignments.find((a) => a.match_number === 73 && a.slot === "home"),
    { match_number: 73, slot: "home", team_id: 1 }
  );
  assert.deepEqual(
    assignments.find((a) => a.match_number === 73 && a.slot === "away"),
    { match_number: 73, slot: "away", team_id: 4 }
  );
});

test("seedRound32FromGroups no pisa slots ya fijados", () => {
  const matches = [
    { match_number: 73, stage: "round_of_32", home_team_id: 99, away_team_id: null },
  ];
  const assignments = seedRound32FromGroups(standings(), matches, positions);
  assert.equal(assignments.some((a) => a.match_number === 73 && a.slot === "home"), false);
});

test("cascadeKnockoutWinners avanza el ganador al slot vacío de la ronda siguiente", () => {
  const matches = [
    {
      match_number: 73,
      stage: "round_of_32",
      home_team_id: 1,
      away_team_id: 4,
      home_score: 3,
      away_score: 0,
      penalty_winner_team_id: null,
      is_finished: true,
    },
    { match_number: 89, stage: "round_of_16", home_team_id: null, away_team_id: null, is_finished: false },
  ];
  const assignments = cascadeKnockoutWinners(matches, positions);
  assert.deepEqual(assignments, [{ match_number: 89, slot: "home", team_id: 1 }]);
});

test("cascadeKnockoutWinners respeta el ganador por penaltis", () => {
  const matches = [
    {
      match_number: 73,
      stage: "round_of_32",
      home_team_id: 1,
      away_team_id: 4,
      home_score: 1,
      away_score: 1,
      penalty_winner_team_id: 4,
      is_finished: true,
    },
    { match_number: 89, stage: "round_of_16", home_team_id: null, away_team_id: null, is_finished: false },
  ];
  const assignments = cascadeKnockoutWinners(matches, positions);
  assert.deepEqual(assignments, [{ match_number: 89, slot: "home", team_id: 4 }]);
});

test("cascadeKnockoutWinners no pisa un slot ya fijado", () => {
  const matches = [
    {
      match_number: 73,
      stage: "round_of_32",
      home_team_id: 1,
      away_team_id: 4,
      home_score: 3,
      away_score: 0,
      penalty_winner_team_id: null,
      is_finished: true,
    },
    { match_number: 89, stage: "round_of_16", home_team_id: 7, away_team_id: null, is_finished: false },
  ];
  const assignments = cascadeKnockoutWinners(matches, positions);
  assert.equal(assignments.length, 0);
});
```

- [ ] **Step 2: Ejecutar el test y ver que falla**

Run: `npx tsx --test src/lib/tournament/actual-bracket.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Crear `src/lib/tournament/actual-bracket.ts`**

```ts
import { populateKnockoutBracket, getMatchWinner, getMatchLoser, type BracketMatch } from "./bracket";
import { getBestThirds, type TeamStanding } from "./standings";

export interface SlotAssignment {
  match_number: number;
  slot: "home" | "away";
  team_id: number;
}

export interface ActualBracketMatch {
  match_number: number;
  stage: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score?: number | null;
  away_score?: number | null;
  penalty_winner_team_id?: number | null;
  is_finished?: boolean | null;
  home_placeholder?: string | null;
  away_placeholder?: string | null;
}

export interface BracketPositionRow {
  match_number: number;
  slot: "home" | "away";
  source_type: string;
  source_group?: string;
  source_match_number?: number;
  best_third_pool?: string;
}

// Calcula las asignaciones de equipos de dieciseisavos (1º/2º de grupo y mejores
// terceros) a partir de la clasificación REAL de los grupos. Solo devuelve
// asignaciones para slots que están vacíos (null) en el cuadro actual, para no
// pisar correcciones manuales del admin.
export function seedRound32FromGroups(
  realGroupStandings: Map<string, TeamStanding[]>,
  matches: Pick<ActualBracketMatch, "match_number" | "stage" | "home_team_id" | "away_team_id" | "home_placeholder" | "away_placeholder">[],
  bracketPositions: BracketPositionRow[]
): SlotAssignment[] {
  const baseMatches: BracketMatch[] = matches.map((m) => ({
    match_number: m.match_number,
    stage: m.stage,
    home_placeholder: m.home_placeholder ?? undefined,
    away_placeholder: m.away_placeholder ?? undefined,
  }));

  // Sin predicciones: populate solo rellena R32 desde los grupos (la cascada no
  // avanza porque no hay marcadores).
  const populated = populateKnockoutBracket(
    realGroupStandings,
    getBestThirds(realGroupStandings),
    baseMatches,
    new Map(),
    bracketPositions
  );

  const currentByNumber = new Map(matches.map((m) => [m.match_number, m]));
  const assignments: SlotAssignment[] = [];
  for (const pm of populated) {
    const current = currentByNumber.get(pm.match_number);
    if (!current) continue;
    if (pm.home_team_id !== undefined && current.home_team_id === null) {
      assignments.push({ match_number: pm.match_number, slot: "home", team_id: pm.home_team_id });
    }
    if (pm.away_team_id !== undefined && current.away_team_id === null) {
      assignments.push({ match_number: pm.match_number, slot: "away", team_id: pm.away_team_id });
    }
  }
  return assignments;
}

// Avanza ganadores (y perdedores, para el 3er puesto) de los cruces terminados a
// los slots vacíos de la ronda siguiente. Multi-pase: una llamada propaga varias
// rondas. Nunca pisa un slot ya fijado.
export function cascadeKnockoutWinners(
  matches: ActualBracketMatch[],
  bracketPositions: BracketPositionRow[]
): SlotAssignment[] {
  const home = new Map<number, number | null>();
  const away = new Map<number, number | null>();
  const meta = new Map<number, ActualBracketMatch>();
  for (const m of matches) {
    home.set(m.match_number, m.home_team_id);
    away.set(m.match_number, m.away_team_id);
    meta.set(m.match_number, m);
  }

  const assignments: SlotAssignment[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const bp of bracketPositions) {
      if (bp.source_type !== "match_winner" && bp.source_type !== "match_loser") continue;
      if (bp.source_match_number === undefined) continue;

      const targetCurrent = bp.slot === "home" ? home.get(bp.match_number) : away.get(bp.match_number);
      if (targetCurrent != null) continue; // slot ya fijado

      const src = meta.get(bp.source_match_number);
      if (!src || !src.is_finished) continue;
      const srcHome = home.get(bp.source_match_number);
      const srcAway = away.get(bp.source_match_number);
      if (srcHome == null || srcAway == null) continue;
      if (src.home_score == null || src.away_score == null) continue;

      const penalty_winner: "home" | "away" | undefined =
        src.penalty_winner_team_id == null
          ? undefined
          : src.penalty_winner_team_id === srcHome
            ? "home"
            : "away";

      const resolved =
        bp.source_type === "match_winner"
          ? getMatchWinner({ home_score: src.home_score, away_score: src.away_score, penalty_winner }, srcHome, srcAway)
          : getMatchLoser({ home_score: src.home_score, away_score: src.away_score, penalty_winner }, srcHome, srcAway);
      if (resolved === undefined) continue;

      if (bp.slot === "home") home.set(bp.match_number, resolved);
      else away.set(bp.match_number, resolved);
      assignments.push({ match_number: bp.match_number, slot: bp.slot, team_id: resolved });
      changed = true;
    }
  }

  return assignments;
}
```

- [ ] **Step 4: Ejecutar el test y ver que pasa**

Run: `npx tsx --test src/lib/tournament/actual-bracket.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tournament/actual-bracket.ts src/lib/tournament/actual-bracket.test.ts
git commit -m "feat(tournament): siembra y cascada del cuadro real"
```

---

## Task 4: Admin — generar cuadro real, selector de equipo y auto-avance

**Files:**
- Modify: `src/app/(admin)/admin/resultados/page.tsx`

Esta tarea es de UI (sin TDD); se valida con `npx tsc --noEmit` y prueba manual.

- [ ] **Step 1: Añadir imports y `group_letter` a `Team`**

En la cabecera de imports añade:

```ts
import { buildRealGroupStandings } from "@/lib/results/group-standings";
import { seedRound32FromGroups, cascadeKnockoutWinners, type ActualBracketMatch, type BracketPositionRow, type SlotAssignment } from "@/lib/tournament/actual-bracket";
```

Cambia la interfaz `Team` para incluir el grupo:

```ts
interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
  group_letter: string | null;
}
```

- [ ] **Step 2: Cargar posiciones del cuadro y el grupo de los equipos**

En el `useEffect` de carga, sustituye el bloque `load()` de fetch por:

```ts
    async function load() {
      const [teamsRes, matchesRes, positionsRes] = await Promise.all([
        supabase.from("teams").select("id, name, code, flag_emoji, group_letter").order("id"),
        supabase.from("matches").select("*").order("match_number"),
        supabase.from("knockout_bracket_positions").select("*"),
      ]);
      setTeams(teamsRes.data || []);
      setMatches(matchesRes.data || []);
      setBracketPositions((positionsRes.data || []) as BracketPositionRow[]);
    }
```

Y añade el estado junto a los demás `useState`:

```ts
  const [bracketPositions, setBracketPositions] = useState<BracketPositionRow[]>([]);
  const [generatingBracket, setGeneratingBracket] = useState(false);
```

- [ ] **Step 3: Helper para persistir asignaciones de slots**

Añade dentro del componente (antes de `handleSaveResult`):

```ts
  const persistSlotAssignments = async (assignments: SlotAssignment[]) => {
    if (assignments.length === 0) return;
    for (const a of assignments) {
      const column = a.slot === "home" ? "home_team_id" : "away_team_id";
      const { error } = await supabase.from("matches").update({ [column]: a.team_id }).eq("match_number", a.match_number);
      if (error) {
        toast({ title: "Error rellenando el cuadro", description: error.message, variant: "destructive" });
        return;
      }
    }
    setMatches((prev) =>
      prev.map((m) => {
        const forMatch = assignments.filter((a) => a.match_number === m.match_number);
        if (forMatch.length === 0) return m;
        const next = { ...m };
        for (const a of forMatch) {
          if (a.slot === "home") next.home_team_id = a.team_id;
          else next.away_team_id = a.team_id;
        }
        return next;
      })
    );
  };
```

- [ ] **Step 4: Botón "Generar/actualizar cuadro real"**

Añade el handler:

```ts
  const handleGenerateBracket = async () => {
    setGeneratingBracket(true);
    const realStandings = buildRealGroupStandings(
      teams.map((t) => ({ id: t.id, name: t.name, flag_emoji: t.flag_emoji, group_letter: t.group_letter })),
      matches.map((m) => ({
        group_letter: m.group_letter,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_score: m.home_score,
        away_score: m.away_score,
        is_finished: m.is_finished,
      }))
    );

    const seed = seedRound32FromGroups(
      realStandings,
      matches.map((m) => ({
        match_number: m.match_number,
        stage: m.stage,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_placeholder: m.home_placeholder,
        away_placeholder: m.away_placeholder,
      })),
      bracketPositions
    );
    await persistSlotAssignments(seed);

    // Aplicar la siembra localmente y cascadear ganadores de cruces ya jugados.
    const seeded: ActualBracketMatch[] = matches.map((m) => {
      const forMatch = seed.filter((a) => a.match_number === m.match_number);
      let homeId = m.home_team_id;
      let awayId = m.away_team_id;
      for (const a of forMatch) {
        if (a.slot === "home") homeId = a.team_id;
        else awayId = a.team_id;
      }
      return {
        match_number: m.match_number,
        stage: m.stage,
        home_team_id: homeId,
        away_team_id: awayId,
        home_score: m.home_score,
        away_score: m.away_score,
        penalty_winner_team_id: m.penalty_winner_team_id,
        is_finished: m.is_finished,
        home_placeholder: m.home_placeholder,
        away_placeholder: m.away_placeholder,
      };
    });
    const cascade = cascadeKnockoutWinners(seeded, bracketPositions);
    await persistSlotAssignments(cascade);

    await recalculateAllScores(supabase);
    setGeneratingBracket(false);
    toast({ title: `Cuadro actualizado (${seed.length + cascade.length} equipos colocados)` });
  };
```

En el header de la página, junto al botón "Recalcular Puntuaciones", añade:

```tsx
        <Button onClick={handleGenerateBracket} disabled={generatingBracket} variant="outline">
          {generatingBracket ? "Generando..." : "Generar cuadro real"}
        </Button>
```

- [ ] **Step 5: Auto-avance al guardar un resultado de cruce**

En `handleSaveResult`, dentro del `else` (tras `setMatches(...)` y el `toast` de guardado, justo antes de `await runRecalculationBeforeNotifications(...)`), añade la cascada:

```ts
      if (updatedMatch.stage !== "group") {
        const nextMatches: ActualBracketMatch[] = matches.map((m) => {
          const base = m.id === match.id ? { ...m, ...updates } : m;
          return {
            match_number: base.match_number,
            stage: base.stage,
            home_team_id: base.home_team_id,
            away_team_id: base.away_team_id,
            home_score: base.home_score,
            away_score: base.away_score,
            penalty_winner_team_id: base.penalty_winner_team_id,
            is_finished: base.is_finished,
            home_placeholder: base.home_placeholder,
            away_placeholder: base.away_placeholder,
          };
        });
        await persistSlotAssignments(cascadeKnockoutWinners(nextMatches, bracketPositions));
      }
```

- [ ] **Step 6: Selector de equipo para slots TBD del cuadro**

En `renderMatchCard`, reemplaza el `<span>` del equipo local:

```tsx
          <span className="text-sm flex-1 min-w-0 truncate flex items-center gap-1 text-ink font-sans">
            {home ? <><Flag emoji={home.flag_emoji} size={16} />{home.code}</> : match.home_placeholder || "TBD"}
          </span>
```

por:

```tsx
          <span className="text-sm flex-1 min-w-0 truncate flex items-center gap-1 text-ink font-sans">
            {home ? (
              <><Flag emoji={home.flag_emoji} size={16} />{home.code}</>
            ) : match.stage !== "group" ? (
              <select
                value=""
                onChange={(e) => handleAssignTeam(match, "home", parseInt(e.target.value))}
                className="h-8 rounded-md border border-border bg-surface px-1 text-xs text-ink"
                aria-label={`Equipo local P${match.match_number}`}
              >
                <option value="">{match.home_placeholder || "TBD"}</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.code}</option>
                ))}
              </select>
            ) : (
              match.home_placeholder || "TBD"
            )}
          </span>
```

Haz el cambio equivalente para el visitante (slot `"away"`, usando `away` y `match.away_placeholder`, con `text-right`/`justify-end` como el original). Y añade el handler:

```ts
  const handleAssignTeam = async (match: Match, slot: "home" | "away", teamId: number) => {
    if (!teamId) return;
    const column = slot === "home" ? "home_team_id" : "away_team_id";
    const { error } = await supabase.from("matches").update({ [column]: teamId }).eq("id", match.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setMatches((prev) => prev.map((m) => (m.id === match.id ? { ...m, [column]: teamId } : m)));
    toast({ title: `Equipo asignado en P${match.match_number}` });
  };
```

- [ ] **Step 7: Typecheck y prueba manual**

Run: `npx tsc --noEmit`
Expected: sin errores.

Prueba manual (anota resultado): con grupos terminados, pulsar "Generar cuadro real" rellena dieciseisavos; meter un resultado de dieciseisavos avanza al equipo a octavos; un slot corregido a mano no se sobreescribe al regenerar.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(admin)/admin/resultados/page.tsx"
git commit -m "feat(admin): generar cuadro real, selector de equipo y auto-avance"
```

---

## Task 5: Comparación partido real ↔ cuadro del usuario (lógica pura)

**Files:**
- Create: `src/lib/results/knockout-comparison.ts`
- Test: `src/lib/results/knockout-comparison.test.ts`

- [ ] **Step 1: Escribir el test**

Crea `src/lib/results/knockout-comparison.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { compareRealMatchToUser } from "./knockout-comparison";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";

const stageByMatchNumber = new Map<number, string>([
  [73, "round_of_32"],
  [80, "round_of_32"],
  [89, "round_of_16"],
]);

function bracket(entries: [number, PredictedKnockoutMatch][]) {
  return new Map<number, PredictedKnockoutMatch>(entries);
}

test("acierto exacto del cruce (en otro slot) → exact", () => {
  const userBracket = bracket([[80, { home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 1 }]]);
  const result = compareRealMatchToUser({
    userBracket,
    stageByMatchNumber,
    stage: "round_of_32",
    realHomeTeamId: 1,
    realAwayTeamId: 2,
    realHomeScore: 2,
    realAwayScore: 1,
    realPenaltyWinnerTeamId: null,
  });
  assert.equal(result.kind, "exact");
});

test("cruce correcto pero marcador no → pairing", () => {
  const userBracket = bracket([[80, { home_team_id: 1, away_team_id: 2, home_score: 0, away_score: 0, penalty_winner: "home" }]]);
  const result = compareRealMatchToUser({
    userBracket,
    stageByMatchNumber,
    stage: "round_of_32",
    realHomeTeamId: 1,
    realAwayTeamId: 2,
    realHomeScore: 2,
    realAwayScore: 1,
    realPenaltyWinnerTeamId: null,
  });
  assert.equal(result.kind, "pairing");
});

test("sin el cruce: marca por equipo si lo lleva en esa ronda y si avanza", () => {
  // El usuario tiene al equipo 1 en R32 (en un cruce contra el 9) y lo hace pasar.
  // No tiene al equipo 2 en R32.
  const userBracket = bracket([[73, { home_team_id: 1, away_team_id: 9, home_score: 3, away_score: 0 }]]);
  const result = compareRealMatchToUser({
    userBracket,
    stageByMatchNumber,
    stage: "round_of_32",
    realHomeTeamId: 1,
    realAwayTeamId: 2,
    realHomeScore: 1,
    realAwayScore: 0,
    realPenaltyWinnerTeamId: null,
  });
  assert.equal(result.kind, "teams");
  if (result.kind === "teams") {
    assert.equal(result.home.inRound, true);
    assert.equal(result.home.advances, true);
    assert.equal(result.away.inRound, false);
    assert.equal(result.away.advances, false);
  }
});
```

- [ ] **Step 2: Ejecutar el test y ver que falla**

Run: `npx tsx --test src/lib/results/knockout-comparison.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Crear `src/lib/results/knockout-comparison.ts`**

```ts
import { findUserPredictionForPairing, isKnockoutPairingExact } from "@/lib/scoring/knockout";
import { didPredictTeamInStage, didPredictTeamWinStage, type PredictedKnockoutMatch } from "@/lib/scoring/qualification";

export interface CompareInput {
  userBracket: Map<number, PredictedKnockoutMatch>;
  stageByMatchNumber: Map<number, string>;
  stage: string;
  realHomeTeamId: number;
  realAwayTeamId: number;
  realHomeScore: number;
  realAwayScore: number;
  realPenaltyWinnerTeamId: number | null;
}

interface TeamFlag {
  inRound: boolean; // el usuario predijo este equipo en esta ronda (cualquier rama)
  advances: boolean; // el usuario predijo que pasa de esta ronda
}

export type PairingComparison =
  | { kind: "exact"; predHome: number; predAway: number } // par + marcador exacto
  | { kind: "pairing"; predHome: number; predAway: number } // par correcto, marcador no
  | { kind: "teams"; home: TeamFlag; away: TeamFlag }; // no tiene el cruce: estado por equipo

// `predHome`/`predAway` se devuelven orientados al partido REAL (goles que el
// usuario asignó al local real y al visitante real).
export function compareRealMatchToUser(input: CompareInput): PairingComparison {
  const {
    userBracket,
    stageByMatchNumber,
    stage,
    realHomeTeamId,
    realAwayTeamId,
    realHomeScore,
    realAwayScore,
    realPenaltyWinnerTeamId,
  } = input;

  const predicted = findUserPredictionForPairing(userBracket, stageByMatchNumber, stage, realHomeTeamId, realAwayTeamId);

  if (predicted && predicted.home_team_id !== undefined && predicted.away_team_id !== undefined && predicted.home_score !== undefined && predicted.away_score !== undefined) {
    const predHome = predicted.home_team_id === realHomeTeamId ? predicted.home_score : predicted.away_score;
    const predAway = predicted.home_team_id === realHomeTeamId ? predicted.away_score : predicted.home_score;
    const exact = isKnockoutPairingExact({
      actual: {
        homeTeamId: realHomeTeamId,
        awayTeamId: realAwayTeamId,
        homeScore: realHomeScore,
        awayScore: realAwayScore,
        penaltyWinner:
          realPenaltyWinnerTeamId === realHomeTeamId
            ? "home"
            : realPenaltyWinnerTeamId === realAwayTeamId
              ? "away"
              : null,
      },
      predicted,
    });
    return { kind: exact ? "exact" : "pairing", predHome, predAway };
  }

  // No tiene el cruce: estado por equipo. Reutiliza la lógica de "clasificado".
  const matchMeta = Array.from(stageByMatchNumber.entries()).map(([match_number, s]) => ({ match_number, stage: s }));
  const flag = (teamId: number): TeamFlag => ({
    inRound: didPredictTeamInStage(matchMeta, userBracket, stage, teamId),
    advances: didPredictTeamWinStage(matchMeta, userBracket, stage, teamId),
  });
  return { kind: "teams", home: flag(realHomeTeamId), away: flag(realAwayTeamId) };
}
```

- [ ] **Step 4: Ejecutar el test y ver que pasa**

Run: `npx tsx --test src/lib/results/knockout-comparison.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/results/knockout-comparison.ts src/lib/results/knockout-comparison.test.ts
git commit -m "feat(results): comparar partido real con el cuadro del usuario"
```

---

## Task 6: Construir el cuadro de un usuario en cliente (lógica reutilizable)

**Files:**
- Create: `src/lib/results/user-bracket.ts`
- Test: `src/lib/results/user-bracket.test.ts`

Reutilizable por la página de resultados y la de eliminatorias para obtener
`Map<number, PredictedKnockoutMatch>` + `stageByMatchNumber` a partir de los
datos que ya se consultan a Supabase.

- [ ] **Step 1: Escribir el test**

Crea `src/lib/results/user-bracket.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { buildUserBracket } from "./user-bracket";

test("buildUserBracket resuelve los equipos de R32 desde las posiciones predichas", () => {
  const baseMatches = [
    { match_number: 73, stage: "round_of_32", home_placeholder: "1A", away_placeholder: "2B" },
  ];
  const predictedStandings = [
    { group_letter: "A", team_id: 1, position: 1, points: 9, goals_for: 5, goals_against: 1, goal_difference: 4 },
    { group_letter: "B", team_id: 2, position: 2, points: 4, goals_for: 3, goals_against: 3, goal_difference: 0 },
  ];
  const positions = [
    { match_number: 73, slot: "home" as const, source_type: "group_winner", source_group: "A" },
    { match_number: 73, slot: "away" as const, source_type: "group_runner_up", source_group: "B" },
  ];

  const { byMatchNumber, stageByMatchNumber } = buildUserBracket({
    baseMatches,
    predictedStandings,
    bestThirdOrder: [],
    predictions: [{ match_number: 73, home_score: 1, away_score: 0, penalty_winner: null }],
    bracketPositions: positions,
  });

  assert.equal(stageByMatchNumber.get(73), "round_of_32");
  const m = byMatchNumber.get(73);
  assert.equal(m?.home_team_id, 1);
  assert.equal(m?.away_team_id, 2);
  assert.equal(m?.home_score, 1);
  assert.equal(m?.away_score, 0);
});
```

- [ ] **Step 2: Ejecutar el test y ver que falla**

Run: `npx tsx --test src/lib/results/user-bracket.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Crear `src/lib/results/user-bracket.ts`**

```ts
import { populateKnockoutBracket, type BracketMatch, type KnockoutPrediction } from "@/lib/tournament/bracket";
import { getBestThirds, type TeamStanding } from "@/lib/tournament/standings";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";

export interface PredictedStandingRow {
  group_letter: string;
  team_id: number;
  position: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
}

export interface BestThirdOrderRow {
  team_id: number;
  rank: number;
}

export interface UserPredictionRow {
  match_number: number;
  home_score: number;
  away_score: number;
  penalty_winner: "home" | "away" | null;
}

export interface BuildUserBracketInput {
  baseMatches: Array<{ match_number: number; stage: string; home_placeholder?: string | null; away_placeholder?: string | null }>;
  predictedStandings: PredictedStandingRow[];
  bestThirdOrder: BestThirdOrderRow[];
  predictions: UserPredictionRow[];
  bracketPositions: Array<{
    match_number: number;
    slot: "home" | "away";
    source_type: string;
    source_group?: string;
    source_match_number?: number;
    best_third_pool?: string;
  }>;
}

export interface BuiltUserBracket {
  byMatchNumber: Map<number, PredictedKnockoutMatch>;
  stageByMatchNumber: Map<number, string>;
}

export function buildUserBracket(input: BuildUserBracketInput): BuiltUserBracket {
  const { baseMatches, predictedStandings, bestThirdOrder, predictions, bracketPositions } = input;

  const groupStandings = new Map<string, TeamStanding[]>();
  for (const row of predictedStandings) {
    const standings = groupStandings.get(row.group_letter) ?? [];
    standings.push({
      team_id: row.team_id,
      position: row.position,
      points: row.points,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: row.goals_for,
      goals_against: row.goals_against,
      goal_difference: row.goal_difference,
    });
    standings.sort((a, b) => a.position - b.position);
    groupStandings.set(row.group_letter, standings);
  }

  const manualOrder = new Map<number, number>();
  for (const row of bestThirdOrder) manualOrder.set(row.team_id, row.rank);

  const predictionMap = new Map<number, KnockoutPrediction>();
  for (const p of predictions) {
    predictionMap.set(p.match_number, {
      match_id: 0,
      match_number: p.match_number,
      home_score: p.home_score,
      away_score: p.away_score,
      penalty_winner: p.penalty_winner ?? undefined,
    });
  }

  const base: BracketMatch[] = baseMatches.map((m) => ({
    match_number: m.match_number,
    stage: m.stage,
    home_placeholder: m.home_placeholder ?? undefined,
    away_placeholder: m.away_placeholder ?? undefined,
  }));

  const populated = populateKnockoutBracket(
    groupStandings,
    getBestThirds(groupStandings, manualOrder),
    base,
    predictionMap,
    bracketPositions
  );

  const byMatchNumber = new Map<number, PredictedKnockoutMatch>();
  const stageByMatchNumber = new Map<number, string>();
  for (const m of populated) {
    byMatchNumber.set(m.match_number, {
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      home_score: m.home_score,
      away_score: m.away_score,
      penalty_winner: m.penalty_winner,
    });
    stageByMatchNumber.set(m.match_number, m.stage);
  }
  return { byMatchNumber, stageByMatchNumber };
}
```

- [ ] **Step 4: Ejecutar el test y ver que pasa**

Run: `npx tsx --test src/lib/results/user-bracket.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/results/user-bracket.ts src/lib/results/user-bracket.test.ts
git commit -m "feat(results): construir el cuadro de un usuario en cliente"
```

---

## Task 7: Componente de cuadro de resultados (real vs predicción)

**Files:**
- Create: `src/components/results/knockout-bracket-results.tsx`

Componente de presentación: recibe los partidos reales del cuadro ya resueltos y
la comparación por partido, y los pinta agrupados por ronda con chips.

- [ ] **Step 1: Crear el componente**

```tsx
"use client";

import { Flag } from "@/components/ui/flag";
import { stageLabel } from "@/lib/tournament/labels";
import type { PairingComparison } from "@/lib/results/knockout-comparison";

export interface KnockoutResultRow {
  matchNumber: number;
  stage: string;
  home: { name: string; flag_emoji: string } | null;
  away: { name: string; flag_emoji: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  comparison: PairingComparison | null;
}

const STAGE_ORDER = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];

function ComparisonChip({ comparison }: { comparison: PairingComparison | null }) {
  if (!comparison) {
    return <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Sin predicción</span>;
  }
  if (comparison.kind === "exact") {
    return (
      <span className="rounded bg-green/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green">
        ✅ Cruce y marcador · tu {comparison.predHome}-{comparison.predAway}
      </span>
    );
  }
  if (comparison.kind === "pairing") {
    return (
      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
        🟡 Tenías el cruce · tu {comparison.predHome}-{comparison.predAway}
      </span>
    );
  }
  // teams
  const tag = (label: string, f: { inRound: boolean; advances: boolean }) =>
    f.inRound ? (
      <span className="rounded bg-blue/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue">
        {label}: en esta ronda{f.advances ? " → pasa" : ""}
      </span>
    ) : null;
  const home = tag("Local", comparison.home);
  const away = tag("Visit.", comparison.away);
  if (!home && !away) {
    return <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">⚪ No coincide</span>;
  }
  return <span className="flex flex-wrap gap-1">{home}{away}</span>;
}

export function KnockoutBracketResults({ rows }: { rows: KnockoutResultRow[] }) {
  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    matches: rows.filter((r) => r.stage === stage).sort((a, b) => a.matchNumber - b.matchNumber),
  })).filter((g) => g.matches.length > 0);

  if (byStage.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="font-marcador text-base uppercase text-ink-muted">Cuadro eliminatorio</p>
        <p className="mt-1 text-xs text-ink-faint">El cuadro real se irá dibujando con los resultados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {byStage.map((group) => (
        <div key={group.stage} className="space-y-2">
          <p className="px-0.5 font-marcador text-xs font-bold uppercase tracking-wide text-ink-muted">
            {stageLabel(group.stage, null)}
          </p>
          {group.matches.map((m) => (
            <div key={m.matchNumber} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="flex flex-1 items-center gap-1 text-sm text-ink">
                  {m.home ? <><Flag emoji={m.home.flag_emoji} size={16} />{m.home.name}</> : "TBD"}
                </span>
                <span className="font-marcador text-sm text-ink">
                  {m.homeScore ?? "-"}-{m.awayScore ?? "-"}
                </span>
                <span className="flex flex-1 items-center justify-end gap-1 text-right text-sm text-ink">
                  {m.away ? <>{m.away.name}<Flag emoji={m.away.flag_emoji} size={16} /></> : "TBD"}
                </span>
              </div>
              <div className="mt-1.5">
                <ComparisonChip comparison={m.comparison} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/results/knockout-bracket-results.tsx
git commit -m "feat(results): componente de cuadro real vs predicción"
```

---

## Task 8: Pestaña "Cuadro" en /resultados + badges de clasificado en "Grupos"

**Files:**
- Modify: `src/app/(app)/resultados/page.tsx`

- [ ] **Step 1: Imports nuevos**

Añade en la cabecera:

```ts
import { buildUserBracket } from "@/lib/results/user-bracket";
import { compareRealMatchToUser } from "@/lib/results/knockout-comparison";
import { getBestThirds } from "@/lib/tournament/standings";
import { KnockoutBracketResults, type KnockoutResultRow } from "@/components/results/knockout-bracket-results";
```

- [ ] **Step 2: Estado para las filas del cuadro y terceros clasificados**

Junto a los demás `useState`:

```ts
  const [knockoutRows, setKnockoutRows] = useState<KnockoutResultRow[]>([]);
  const [bestThirdIds, setBestThirdIds] = useState<Set<number>>(new Set());
```

- [ ] **Step 3: Cargar datos del cuadro del usuario y construir las filas**

En `load()`, amplía el `Promise.all` para incluir las consultas del cuadro del usuario. Sustituye la consulta de predicciones por una que incluya `penalty_winner`, y añade tres consultas más:

```ts
          uid
            ? supabase
                .from("match_predictions")
                .select("match_id, home_score, away_score, penalty_winner")
                .eq("user_id", uid)
            : Promise.resolve({ data: [] as PredictionRow[], error: null }),
```

Añade al final del `Promise.all` (como nuevos elementos del array y su destructuring):

```ts
          uid
            ? supabase.from("predicted_group_standings").select("group_letter, team_id, position, points, goals_for, goals_against, goal_difference").eq("user_id", uid)
            : Promise.resolve({ data: [], error: null }),
          uid
            ? supabase.from("predicted_best_third_order").select("team_id, rank").eq("user_id", uid)
            : Promise.resolve({ data: [], error: null }),
          supabase.from("knockout_bracket_positions").select("*"),
```

Tras construir `matches`/`teams`/`predictions` y `realGroupStandings`, añade:

```ts
      const predStandings = (predStandingsRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["predictedStandings"];
      const bestThirdOrder = (bestThirdRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["bestThirdOrder"];
      const bracketPositions = (positionsRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["bracketPositions"];

      const knockoutBase = matches
        .filter((m) => m.stage !== "group")
        .map((m) => ({ match_number: m.match_number, stage: m.stage, home_placeholder: m.home_placeholder, away_placeholder: m.away_placeholder }));

      const predForBracket = predictions.map((p) => {
        const match = matches.find((m) => m.id === p.match_id);
        return {
          match_number: match?.match_number ?? -1,
          home_score: p.home_score,
          away_score: p.away_score,
          penalty_winner: (p as PredictionRow & { penalty_winner?: "home" | "away" | null }).penalty_winner ?? null,
        };
      }).filter((p) => p.match_number > 0);

      const { byMatchNumber, stageByMatchNumber } = buildUserBracket({
        baseMatches: knockoutBase,
        predictedStandings: predStandings,
        bestThirdOrder,
        predictions: predForBracket,
        bracketPositions,
      });

      const rows: KnockoutResultRow[] = matches
        .filter((m) => m.stage !== "group")
        .sort((a, b) => a.match_number - b.match_number)
        .map((m) => {
          const home = m.home_team_id ? teamMap.get(m.home_team_id) : undefined;
          const away = m.away_team_id ? teamMap.get(m.away_team_id) : undefined;
          let comparison = null;
          if (m.home_team_id && m.away_team_id && m.home_score !== null && m.away_score !== null) {
            comparison = compareRealMatchToUser({
              userBracket: byMatchNumber,
              stageByMatchNumber,
              stage: m.stage,
              realHomeTeamId: m.home_team_id,
              realAwayTeamId: m.away_team_id,
              realHomeScore: m.home_score,
              realAwayScore: m.away_score,
              realPenaltyWinnerTeamId: null,
            });
          }
          return {
            matchNumber: m.match_number,
            stage: m.stage,
            home: home ? { name: home.name, flag_emoji: home.flag_emoji } : null,
            away: away ? { name: away.name, flag_emoji: away.flag_emoji } : null,
            homeScore: m.home_score,
            awayScore: m.away_score,
            comparison,
          };
        });
      setKnockoutRows(rows);
```

> Nota: `MatchRow` no incluye `penalty_winner_team_id`; la comparación de empates de la UI usa `realPenaltyWinnerTeamId: null` (no afecta a marcadores con ganador en los 90'). Si se quiere precisión en empates resueltos por penaltis, añadir `penalty_winner_team_id` al `select` de `matches` y a `MatchRow`, y pasarlo aquí.

`teamMap` se usa antes de su definición actual (está en un `useMemo` fuera de `load`). Dentro de `load`, usa el `teamMap` local ya construido (`const teamMap = new Map<number, TeamRow>(...)`), que existe en el scope de `load`.

Calcula también los mejores terceros reales para badges:

```ts
      const thirds = getBestThirds(buildRealGroupStandings(teams, matches));
      setBestThirdIds(new Set(thirds.map((t) => t.team_id)));
```

Y añade al destructuring del `Promise.all` los tres nuevos resultados: `predStandingsRes`, `bestThirdRes`, `positionsRes`.

- [ ] **Step 4: Renderizar la pestaña "Cuadro"**

Sustituye el bloque placeholder de `activeTab === "cuadro"` por:

```tsx
      {activeTab === "cuadro" && (
        <KnockoutBracketResults rows={knockoutRows} />
      )}
```

- [ ] **Step 5: Badges de clasificado en la pestaña "Grupos"**

Dentro del `map` de standings de la pestaña Grupos, en la celda del nombre del equipo, añade un badge según posición / mejor tercero. Sustituye el bloque del nombre:

```tsx
                      <div className="flex min-w-0 items-center gap-2">
                        {team && <Flag emoji={team.flag_emoji} size={18} />}
                        <span className="truncate text-sm font-semibold text-ink">
                          {team?.name ?? "Equipo"}
                        </span>
                      </div>
```

por:

```tsx
                      <div className="flex min-w-0 items-center gap-2">
                        {team && <Flag emoji={team.flag_emoji} size={18} />}
                        <span className="truncate text-sm font-semibold text-ink">
                          {team?.name ?? "Equipo"}
                        </span>
                        {standing.position === 1 && (
                          <span className="shrink-0 rounded bg-green/15 px-1 text-[9px] font-bold uppercase text-green">1º</span>
                        )}
                        {(standing.position === 1 || standing.position === 2) && (
                          <span className="shrink-0 rounded bg-blue/15 px-1 text-[9px] font-bold uppercase text-blue">Clasificado</span>
                        )}
                        {standing.position === 3 && bestThirdIds.has(standing.team_id) && (
                          <span className="shrink-0 rounded bg-amber-500/15 px-1 text-[9px] font-bold uppercase text-amber-600">Mejor 3º</span>
                        )}
                      </div>
```

- [ ] **Step 6: Typecheck y prueba manual**

Run: `npx tsc --noEmit`
Expected: sin errores.

Prueba manual: en `/resultados` pestaña "Cuadro", los cruces reales se muestran con el chip correcto (exacto / tenías el cruce / por equipo / no coincide). En "Grupos", los clasificados llevan badge.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/resultados/page.tsx"
git commit -m "feat(results): pestaña cuadro real vs predicción y badges de clasificado"
```

---

## Task 9: Overlay de resultado real en la vista Cuadro de eliminatorias

**Files:**
- Modify: `src/app/(app)/predicciones/eliminatorias/page.tsx`

Mostrar, en la vista "Cuadro" de las predicciones del usuario, un pequeño
indicador por partido cuando ya hay resultado real, reutilizando
`compareRealMatchToUser`. Alcance mínimo: badge de estado por partido.

- [ ] **Step 1: Inspeccionar la página y localizar el render de la vista "Cuadro"**

Run: `npx tsx -e "0"` (no-op) y abre el archivo. Identifica dónde se mapea cada partido del cuadro (componente `ClassicBracket` / `MatchNode`) y qué datos de partidos reales hay disponibles (`matches` con `home_team_id`, `home_score`).

- [ ] **Step 2: Construir comparaciones por partido real**

Reutiliza `buildUserBracket` (ya tienes standings/predicciones/posiciones cargadas en esta página) y `compareRealMatchToUser`, igual que en Task 8, para producir un `Map<number, PairingComparison>` indexado por `match_number` de los partidos reales terminados.

```ts
import { compareRealMatchToUser, type PairingComparison } from "@/lib/results/knockout-comparison";
// ...
const realComparisonByMatchNumber = new Map<number, PairingComparison>();
for (const m of realMatches) {
  if (m.stage === "group") continue;
  if (!m.home_team_id || !m.away_team_id || m.home_score === null || m.away_score === null) continue;
  realComparisonByMatchNumber.set(
    m.match_number,
    compareRealMatchToUser({
      userBracket: byMatchNumber,
      stageByMatchNumber,
      stage: m.stage,
      realHomeTeamId: m.home_team_id,
      realAwayTeamId: m.away_team_id,
      realHomeScore: m.home_score,
      realAwayScore: m.away_score,
      realPenaltyWinnerTeamId: null,
    })
  );
}
```

- [ ] **Step 3: Pintar un badge por partido en la vista Cuadro**

Donde se renderiza cada nodo del cuadro, si existe comparación para ese `match_number`, muestra un punto/etiqueta:
- `exact` → ✅ verde
- `pairing` → 🟡 ámbar
- `teams` → 🔵 azul si algún equipo `inRound`, si no nada.

Mantén el cambio acotado (un `<span>` pequeño en la esquina del nodo). No reestructures `ClassicBracket`.

- [ ] **Step 4: Typecheck y prueba manual**

Run: `npx tsc --noEmit`
Expected: sin errores.

Prueba manual: en `/predicciones/eliminatorias` vista "Cuadro", los partidos con resultado real muestran el badge correspondiente.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/predicciones/eliminatorias/page.tsx"
git commit -m "feat(predicciones): overlay de resultado real en la vista cuadro"
```

---

## Task 10: Tests de verificación (#4 y #5)

**Files:**
- Modify: `src/lib/scoring/qualification.test.ts`

- [ ] **Step 1: Añadir test de "clasificado por cualquier rama" (#4)**

Añade al final de `src/lib/scoring/qualification.test.ts` (mantén los imports existentes; añade lo necesario):

```ts
import { didPredictTeamInStage } from "./qualification";
import type { PredictedKnockoutMatch } from "./qualification";

test("clasificado a ronda puntúa aunque el equipo llegue por otra rama (#4)", () => {
  const matches = [
    { match_number: 89, stage: "round_of_16" },
    { match_number: 90, stage: "round_of_16" },
  ];
  // El usuario predijo al equipo 7 en octavos, pero en el partido 90 (otra rama).
  const userBracket = new Map<number, PredictedKnockoutMatch>([
    [90, { home_team_id: 7, away_team_id: 8 }],
  ]);
  // El equipo 7 llega realmente a octavos (da igual el partido) → debe contar.
  assert.equal(didPredictTeamInStage(matches, userBracket, "round_of_16", 7), true);
  // Un equipo que el usuario NO puso en octavos no cuenta.
  assert.equal(didPredictTeamInStage(matches, userBracket, "round_of_16", 99), false);
});
```

> #5 (fase de grupos, orden de grupos, `qualify_r32`) ya está cubierto por
> `src/lib/scoring/group-stage.test.ts`, `src/lib/scoring/qualification.test.ts`
> y `src/lib/scoring/calculator.test.ts`. La parte de "mostrar el ganador" se
> implementa en Task 8 (badges de clasificado en la pestaña Grupos).

- [ ] **Step 2: Ejecutar toda la batería de scoring**

Run: `npx tsx --test src/lib/scoring/*.test.ts`
Expected: PASS (todos).

- [ ] **Step 3: Commit**

```bash
git add src/lib/scoring/qualification.test.ts
git commit -m "test(scoring): clasificado por cualquier rama (#4)"
```

---

## Task 11: Verificación final

- [ ] **Step 1: Typecheck completo**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 2: Toda la batería de tests tocada**

Run:
```
npx tsx --test src/lib/scoring/knockout.test.ts src/lib/scoring/calculator.test.ts src/lib/tournament/actual-bracket.test.ts src/lib/results/knockout-comparison.test.ts src/lib/results/user-bracket.test.ts src/lib/scoring/qualification.test.ts
```
Expected: PASS (todos).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 4: Prueba manual end-to-end**

1. Admin: con grupos terminados, "Generar cuadro real" → dieciseisavos poblados.
2. Admin: meter un resultado de dieciseisavos → el ganador avanza a octavos; la clasificación se recalcula.
3. Usuario que puso ese mismo cruce en otro slot y acertó el marcador → recibe los puntos exactos de esa ronda.
4. `/resultados` pestaña Cuadro: chips correctos. Pestaña Grupos: badges de clasificado.
5. `/predicciones/eliminatorias` vista Cuadro: badges de resultado real.

---

## Notas de implementación

- **Producción usa Supabase real**: los cambios de esquema no aplican aquí (no hay migraciones nuevas; se reutilizan tablas existentes). El recálculo de puntuaciones lo dispara el admin como hasta ahora.
- **Orden de ejecución recomendado**: Tasks 1→2 (puntuación), 3→4 (cuadro admin), 5→6→7→8 (visualización resultados), 9 (overlay eliminatorias), 10 (tests #4/#5), 11 (verificación).
- Tasks 1, 3, 5, 6 y 10 son lógica pura con TDD estricto. Tasks 4, 7, 8, 9 son UI (typecheck + prueba manual).
