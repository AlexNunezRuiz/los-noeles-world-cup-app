# Cruce del pronóstico + resumen de puntuaciones en eliminatorias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En eliminatorias, mostrar el cruce real que lleva el usuario (banderas + su marcador) con un desplegable que indica en qué ronda eliminó a cada selección real, aplicarlo en Calendario/Resultados/Detalle con marcador tipo tablón, y dar acceso al resumen de puntuaciones (con clasificados por ronda) desde la porra y la cuenta.

**Architecture:** Se añade un helper puro `getUserEliminationRound` y un componente colapsable compartido `PronosticoCruce` que consume el cuadro del usuario (`buildUserBracket`). Un loader compartido `loadUserBracket` reconstruye ese cuadro en Calendario y Detalle (ya existe en Resultados). El desglose de puntuaciones se enriquece con clasificados por ronda derivados de `score_events` (fuente autoritativa), y se enlaza desde Porra y Mi Cuenta al perfil propio.

**Tech Stack:** Next.js 14 (App Router, client components), React 18, TypeScript, Tailwind, Supabase JS. Tests con `node:test` vía `npx tsx --test <archivo>`.

## Global Constraints

- Idioma de UI: español. Copys en el mismo tono que el resto (mayúsculas `font-marcador` para etiquetas).
- No `npm test`: ejecutar tests con `npx tsx --test <ruta-al-archivo>`. Typecheck con `npx tsc --noEmit`. Lint con `npm run lint`.
- La puntuación de eliminatorias empareja por IDs de selección (`findUserPredictionForPairing`), NO por casilla. No modificar esa regla.
- El cuadro del usuario se construye con `buildUserBracket` (`src/lib/results/user-bracket.ts`), que devuelve `{ byMatchNumber: Map<number, PredictedKnockoutMatch>, stageByMatchNumber: Map<number, string> }`, ambos indexados por `match_number`.
- Etiquetas de ronda: `round_of_32`→"Dieciseisavos", `round_of_16`→"Octavos", `quarter_final`→"Cuartos", `semi_final`→"Semifinales", `third_place`→"3er/4º", `final`→"Final".
- Ramas de eliminación no jugadas usan la etiqueta "No la clasificabas"; campeón usa "Campeón".
- Desplegables cerrados por defecto.
- Commits frecuentes en la rama `feat/cruce-pronostico-eliminatorias`.

---

### Task 1: Helper `getUserEliminationRound`

**Files:**
- Create: `src/lib/results/elimination-round.ts`
- Test: `src/lib/results/elimination-round.test.ts`

**Interfaces:**
- Consumes: `PredictedKnockoutMatch`, `didPredictTeamInStage`, `didPredictTeamWinStage` from `@/lib/scoring/qualification`.
- Produces:
  ```ts
  type EliminationResult =
    | { kind: "eliminated"; stage: string }
    | { kind: "champion" }
    | { kind: "not_qualified" };
  function getUserEliminationRound(
    bracket: Map<number, PredictedKnockoutMatch>,
    stageByMatchNumber: Map<number, string>,
    teamId: number
  ): EliminationResult;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/lib/results/elimination-round.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getUserEliminationRound } from "./elimination-round";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";

// Helper: build the two maps from a list of {match_number, stage, home, away, hs, as, pen}
function build(
  rows: Array<{
    match_number: number;
    stage: string;
    home?: number;
    away?: number;
    hs?: number;
    as?: number;
    pen?: "home" | "away";
  }>
) {
  const bracket = new Map<number, PredictedKnockoutMatch>();
  const stageByMatchNumber = new Map<number, string>();
  for (const r of rows) {
    bracket.set(r.match_number, {
      home_team_id: r.home,
      away_team_id: r.away,
      home_score: r.hs,
      away_score: r.as,
      penalty_winner: r.pen,
    });
    stageByMatchNumber.set(r.match_number, r.stage);
  }
  return { bracket, stageByMatchNumber };
}

test("team eliminated in round_of_32 (appears and loses)", () => {
  // Team 10 loses its R32 match to team 11
  const { bracket, stageByMatchNumber } = build([
    { match_number: 1, stage: "round_of_32", home: 10, away: 11, hs: 0, as: 1 },
  ]);
  const res = getUserEliminationRound(bracket, stageByMatchNumber, 10);
  assert.deepEqual(res, { kind: "eliminated", stage: "round_of_32" });
});

test("team eliminated in semi_final", () => {
  const { bracket, stageByMatchNumber } = build([
    { match_number: 1, stage: "round_of_32", home: 10, away: 11, hs: 2, as: 0 },
    { match_number: 20, stage: "round_of_16", home: 10, away: 12, hs: 1, as: 0 },
    { match_number: 30, stage: "quarter_final", home: 10, away: 13, hs: 3, as: 2 },
    { match_number: 40, stage: "semi_final", home: 10, away: 14, hs: 0, as: 1 },
  ]);
  const res = getUserEliminationRound(bracket, stageByMatchNumber, 10);
  assert.deepEqual(res, { kind: "eliminated", stage: "semi_final" });
});

test("team is champion when it wins the final", () => {
  const { bracket, stageByMatchNumber } = build([
    { match_number: 40, stage: "semi_final", home: 10, away: 14, hs: 2, as: 1 },
    { match_number: 50, stage: "final", home: 10, away: 15, hs: 1, as: 0 },
  ]);
  const res = getUserEliminationRound(bracket, stageByMatchNumber, 10);
  assert.deepEqual(res, { kind: "champion" });
});

test("champion decided on penalties (draw + penalty_winner)", () => {
  const { bracket, stageByMatchNumber } = build([
    { match_number: 50, stage: "final", home: 10, away: 15, hs: 1, as: 1, pen: "home" },
  ]);
  const res = getUserEliminationRound(bracket, stageByMatchNumber, 10);
  assert.deepEqual(res, { kind: "champion" });
});

test("team not in bracket → not_qualified", () => {
  const { bracket, stageByMatchNumber } = build([
    { match_number: 1, stage: "round_of_32", home: 10, away: 11, hs: 0, as: 1 },
  ]);
  const res = getUserEliminationRound(bracket, stageByMatchNumber, 99);
  assert.deepEqual(res, { kind: "not_qualified" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/results/elimination-round.test.ts`
Expected: FAIL — cannot find module `./elimination-round`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/results/elimination-round.ts`:

```ts
import {
  didPredictTeamInStage,
  didPredictTeamWinStage,
  type PredictedKnockoutMatch,
} from "@/lib/scoring/qualification";

export type EliminationResult =
  | { kind: "eliminated"; stage: string }
  | { kind: "champion" }
  | { kind: "not_qualified" };

// Rondas de avance del cuadro, de la más temprana a la más tardía. `third_place`
// no cuenta como avance (es un partido paralelo), por eso no está aquí.
const KO_STAGES = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"];

/**
 * Deriva del cuadro del usuario en qué ronda cae una selección: la primera ronda
 * donde aparece y NO gana. Si gana todas las rondas donde aparece → campeón. Si
 * no aparece en ninguna ronda → no la clasificaba.
 */
export function getUserEliminationRound(
  bracket: Map<number, PredictedKnockoutMatch>,
  stageByMatchNumber: Map<number, string>,
  teamId: number
): EliminationResult {
  const matchMeta = Array.from(stageByMatchNumber.entries()).map(
    ([match_number, stage]) => ({ match_number, stage })
  );

  let appearedAnywhere = false;
  for (const stage of KO_STAGES) {
    if (!didPredictTeamInStage(matchMeta, bracket, stage, teamId)) continue;
    appearedAnywhere = true;
    if (!didPredictTeamWinStage(matchMeta, bracket, stage, teamId)) {
      return { kind: "eliminated", stage };
    }
  }

  return appearedAnywhere ? { kind: "champion" } : { kind: "not_qualified" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/results/elimination-round.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/results/elimination-round.ts src/lib/results/elimination-round.test.ts
git commit -m "feat(results): helper getUserEliminationRound para rondas de eliminacion del cuadro"
```

---

### Task 2: Test de regresión — no dar puntos por cruce equivocado

Confirma el diagnóstico: `scoreKnockoutExact` no otorga puntos si el usuario llevaba un cruce distinto al real.

**Files:**
- Test: `src/lib/scoring/knockout-wrong-pairing.test.ts`

**Interfaces:**
- Consumes: `scoreKnockoutExact` from `@/lib/scoring/knockout`; `PredictedKnockoutMatch` from `@/lib/scoring/qualification`.

- [ ] **Step 1: Write the test**

Create `src/lib/scoring/knockout-wrong-pairing.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreKnockoutExact } from "./knockout";
import type { PredictedKnockoutMatch } from "./qualification";

test("no da puntos exactos cuando el usuario llevaba otro cruce en esa ronda", () => {
  // Partido real: equipos 100 vs 200, 2-0, en dieciseisavos, casilla match_number 1.
  const realMatch = {
    id: 5,
    match_number: 1,
    stage: "round_of_32",
    home_score: 2,
    away_score: 0,
    penalty_winner_team_id: null,
    home_team_id: 100,
    away_team_id: 200,
  };

  // El usuario NO llevaba a 100 vs 200. En su casilla puso 300 vs 400, con 2-0.
  const userBracket = new Map<number, PredictedKnockoutMatch>([
    [1, { home_team_id: 300, away_team_id: 400, home_score: 2, away_score: 0 }],
  ]);
  const stageByMatchNumber = new Map<number, string>([[1, "round_of_32"]]);
  const rules = new Map<string, number>([["exact_r32", 5]]);

  const events = scoreKnockoutExact(
    realMatch,
    rules,
    new Map([["user-1", userBracket]]),
    stageByMatchNumber
  );

  assert.equal(events.length, 0, "no debe puntuar: el cruce era distinto");
});

test("sí da puntos exactos cuando el cruce y marcador coinciden por pareja", () => {
  const realMatch = {
    id: 5,
    match_number: 1,
    stage: "round_of_32",
    home_score: 2,
    away_score: 0,
    penalty_winner_team_id: null,
    home_team_id: 100,
    away_team_id: 200,
  };
  // Usuario llevaba el mismo par (aunque en orden invertido de casilla) con 0-2.
  const userBracket = new Map<number, PredictedKnockoutMatch>([
    [1, { home_team_id: 200, away_team_id: 100, home_score: 0, away_score: 2 }],
  ]);
  const stageByMatchNumber = new Map<number, string>([[1, "round_of_32"]]);
  const rules = new Map<string, number>([["exact_r32", 5]]);

  const events = scoreKnockoutExact(
    realMatch,
    rules,
    new Map([["user-1", userBracket]]),
    stageByMatchNumber
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].points, 5);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx tsx --test src/lib/scoring/knockout-wrong-pairing.test.ts`
Expected: PASS (2 tests). (Si falla el primero, hay un bug de scoring real; deténgase y avise.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/scoring/knockout-wrong-pairing.test.ts
git commit -m "test(scoring): regresion — sin puntos exactos por cruce equivocado en eliminatorias"
```

---

### Task 3: Loader compartido `loadUserBracket`

Extrae la reconstrucción del cuadro del usuario para reutilizarla en Calendario y Detalle (Resultados ya lo hace inline).

**Files:**
- Create: `src/lib/results/load-user-bracket.ts`

**Interfaces:**
- Consumes: `buildUserBracket`, `BuiltUserBracket` from `@/lib/results/user-bracket`; a Supabase client.
- Produces:
  ```ts
  interface LoadUserBracketMatch {
    id: number;
    match_number: number;
    stage: string;
    home_placeholder: string | null;
    away_placeholder: string | null;
  }
  interface LoadUserBracketPrediction {
    match_id: number;
    home_score: number;
    away_score: number;
    penalty_winner?: "home" | "away" | null;
  }
  async function loadUserBracket(
    supabase: SupabaseClient,
    uid: string,
    matches: LoadUserBracketMatch[],
    predictions: LoadUserBracketPrediction[]
  ): Promise<BuiltUserBracket>;
  ```

- [ ] **Step 1: Write the implementation**

Create `src/lib/results/load-user-bracket.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildUserBracket, type BuiltUserBracket } from "@/lib/results/user-bracket";

export interface LoadUserBracketMatch {
  id: number;
  match_number: number;
  stage: string;
  home_placeholder: string | null;
  away_placeholder: string | null;
}

export interface LoadUserBracketPrediction {
  match_id: number;
  home_score: number;
  away_score: number;
  penalty_winner?: "home" | "away" | null;
}

const EMPTY: BuiltUserBracket = {
  byMatchNumber: new Map(),
  stageByMatchNumber: new Map(),
};

/**
 * Reconstruye el cuadro predicho del usuario a partir de sus posiciones de grupo,
 * orden de mejores terceros y predicciones de partido. Reutilizable en Calendario,
 * Resultados y Detalle. Devuelve mapas vacíos si no hay usuario.
 */
export async function loadUserBracket(
  supabase: SupabaseClient,
  uid: string,
  matches: LoadUserBracketMatch[],
  predictions: LoadUserBracketPrediction[]
): Promise<BuiltUserBracket> {
  if (!uid) return EMPTY;

  const [standingsRes, bestThirdRes, positionsRes] = await Promise.all([
    supabase
      .from("predicted_group_standings")
      .select("group_letter, team_id, position, points, goals_for, goals_against, goal_difference")
      .eq("user_id", uid),
    supabase.from("predicted_best_third_order").select("team_id, rank").eq("user_id", uid),
    supabase.from("knockout_bracket_positions").select("*"),
  ]);

  const predictedStandings = (standingsRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["predictedStandings"];
  const bestThirdOrder = (bestThirdRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["bestThirdOrder"];
  const bracketPositions = (positionsRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["bracketPositions"];

  const matchNumberById = new Map(matches.map((m) => [m.id, m.match_number]));

  const knockoutBase = matches
    .filter((m) => m.stage !== "group")
    .map((m) => ({
      match_number: m.match_number,
      stage: m.stage,
      home_placeholder: m.home_placeholder,
      away_placeholder: m.away_placeholder,
    }));

  const predForBracket = predictions
    .map((p) => ({
      match_number: matchNumberById.get(p.match_id) ?? -1,
      home_score: p.home_score,
      away_score: p.away_score,
      penalty_winner: p.penalty_winner ?? null,
    }))
    .filter((p) => p.match_number > 0);

  return buildUserBracket({
    baseMatches: knockoutBase,
    predictedStandings,
    bestThirdOrder,
    predictions: predForBracket,
    bracketPositions,
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to `load-user-bracket.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/results/load-user-bracket.ts
git commit -m "feat(results): loader compartido loadUserBracket"
```

---

### Task 4: Componente compartido `PronosticoCruce`

Desplegable que muestra el cruce que el usuario lleva en esa casilla (banderas + su marcador) y, al abrir, la ronda de eliminación de cada selección real.

**Files:**
- Create: `src/components/results/pronostico-cruce.tsx`
- Create: `src/lib/results/stage-labels.ts`
- Test: `src/lib/results/stage-labels.test.ts`

**Interfaces:**
- Consumes: `getUserEliminationRound`, `EliminationResult` from `@/lib/results/elimination-round`; `PredictedKnockoutMatch` from `@/lib/scoring/qualification`; `Flag` from `@/components/ui/flag`; `PairingComparison` from `@/lib/results/knockout-comparison`.
- Produces:
  ```ts
  // stage-labels.ts
  function stageShortLabel(stage: string): string;
  function eliminationLabel(res: EliminationResult): string;
  // pronostico-cruce.tsx
  interface PronosticoCruceTeam { name: string; flag_emoji: string }
  interface PronosticoCruceProps {
    matchNumber: number;
    stage: string;
    realHomeTeamId: number;
    realAwayTeamId: number;
    bracket: Map<number, PredictedKnockoutMatch>;
    stageByMatchNumber: Map<number, string>;
    teams: Map<number, PronosticoCruceTeam>;
    comparison?: PairingComparison | null;
  }
  function PronosticoCruce(props: PronosticoCruceProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test for stage-labels**

Create `src/lib/results/stage-labels.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { stageShortLabel, eliminationLabel } from "./stage-labels";

test("stageShortLabel maps known stages", () => {
  assert.equal(stageShortLabel("round_of_32"), "Dieciseisavos");
  assert.equal(stageShortLabel("round_of_16"), "Octavos");
  assert.equal(stageShortLabel("quarter_final"), "Cuartos");
  assert.equal(stageShortLabel("semi_final"), "Semifinales");
  assert.equal(stageShortLabel("third_place"), "3er/4º");
  assert.equal(stageShortLabel("final"), "Final");
});

test("eliminationLabel covers champion / not_qualified / eliminated", () => {
  assert.equal(eliminationLabel({ kind: "champion" }), "Campeón");
  assert.equal(eliminationLabel({ kind: "not_qualified" }), "No la clasificabas");
  assert.equal(
    eliminationLabel({ kind: "eliminated", stage: "semi_final" }),
    "Semifinales"
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/results/stage-labels.test.ts`
Expected: FAIL — cannot find module `./stage-labels`.

- [ ] **Step 3: Implement stage-labels**

Create `src/lib/results/stage-labels.ts`:

```ts
import type { EliminationResult } from "./elimination-round";

const STAGE_SHORT: Record<string, string> = {
  round_of_32: "Dieciseisavos",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinales",
  third_place: "3er/4º",
  final: "Final",
};

export function stageShortLabel(stage: string): string {
  return STAGE_SHORT[stage] ?? stage;
}

export function eliminationLabel(res: EliminationResult): string {
  if (res.kind === "champion") return "Campeón";
  if (res.kind === "not_qualified") return "No la clasificabas";
  return stageShortLabel(res.stage);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/results/stage-labels.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement the `PronosticoCruce` component**

Create `src/components/results/pronostico-cruce.tsx`:

```tsx
"use client";

import { ChevronDown } from "lucide-react";
import { Flag } from "@/components/ui/flag";
import {
  getUserEliminationRound,
  type EliminationResult,
} from "@/lib/results/elimination-round";
import { eliminationLabel } from "@/lib/results/stage-labels";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";
import type { PairingComparison } from "@/lib/results/knockout-comparison";

export interface PronosticoCruceTeam {
  name: string;
  flag_emoji: string;
}

export interface PronosticoCruceProps {
  matchNumber: number;
  stage: string;
  realHomeTeamId: number;
  realAwayTeamId: number;
  bracket: Map<number, PredictedKnockoutMatch>;
  stageByMatchNumber: Map<number, string>;
  teams: Map<number, PronosticoCruceTeam>;
  comparison?: PairingComparison | null;
}

function AcertiBadge({ comparison }: { comparison: PairingComparison | null | undefined }) {
  if (comparison?.kind === "exact") {
    return (
      <span className="rounded bg-green/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-green">
        ✅ Cruce y marcador
      </span>
    );
  }
  if (comparison?.kind === "pairing") {
    return (
      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">
        🟡 Tenías el cruce
      </span>
    );
  }
  return null;
}

function EliminationLine({
  team,
  res,
}: {
  team: PronosticoCruceTeam | undefined;
  res: EliminationResult;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-xs">
      <span className="flex min-w-0 items-center gap-1.5">
        {team?.flag_emoji && <Flag emoji={team.flag_emoji} size={16} />}
        <span className="truncate text-ink">{team?.name ?? "?"}</span>
      </span>
      <span className="shrink-0 font-marcador text-[11px] font-bold uppercase text-ink-muted">
        {eliminationLabel(res)}
      </span>
    </div>
  );
}

/**
 * Muestra el cruce que el usuario lleva en esa casilla del cuadro (por
 * match_number) con banderas + su marcador, y al desplegar, la ronda donde
 * eliminó a cada una de las dos selecciones reales del partido.
 */
export function PronosticoCruce({
  matchNumber,
  stage,
  realHomeTeamId,
  realAwayTeamId,
  bracket,
  stageByMatchNumber,
  teams,
  comparison,
}: PronosticoCruceProps) {
  const slot = bracket.get(matchNumber);
  const slotHome = slot?.home_team_id != null ? teams.get(slot.home_team_id) : undefined;
  const slotAway = slot?.away_team_id != null ? teams.get(slot.away_team_id) : undefined;
  const hasSlot =
    slot?.home_team_id != null &&
    slot?.away_team_id != null &&
    slot?.home_score != null &&
    slot?.away_score != null;

  const realHomeElim = getUserEliminationRound(bracket, stageByMatchNumber, realHomeTeamId);
  const realAwayElim = getUserEliminationRound(bracket, stageByMatchNumber, realAwayTeamId);

  return (
    <details className="group rounded-lg border border-blue/30 bg-blue/8">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-1.5">
        <span className="font-marcador text-[9px] font-bold uppercase tracking-wider text-blue">
          Tu pronóstico
        </span>
        {hasSlot ? (
          <span className="flex flex-1 items-center justify-center gap-1.5 text-xs font-bold text-ink">
            {slotHome?.flag_emoji && <Flag emoji={slotHome.flag_emoji} size={16} />}
            <span className="font-marcador">
              {slot!.home_score}–{slot!.away_score}
            </span>
            {slotAway?.flag_emoji && <Flag emoji={slotAway.flag_emoji} size={16} />}
          </span>
        ) : (
          <span className="flex-1 text-center text-[10px] font-bold uppercase text-ink-faint">
            Sin predicción
          </span>
        )}
        <AcertiBadge comparison={comparison} />
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-1 border-t border-dashed border-blue/20 px-2 py-2">
        {hasSlot && (
          <div className="flex items-center justify-center gap-2 pb-1 text-sm font-bold text-ink">
            <span className="flex items-center gap-1.5">
              {slotHome?.flag_emoji && <Flag emoji={slotHome.flag_emoji} size={18} />}
              <span className="truncate">{slotHome?.name ?? "?"}</span>
            </span>
            <span className="font-marcador">
              {slot!.home_score}–{slot!.away_score}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="truncate">{slotAway?.name ?? "?"}</span>
              {slotAway?.flag_emoji && <Flag emoji={slotAway.flag_emoji} size={18} />}
            </span>
          </div>
        )}
        <p className="pt-0.5 text-[9px] font-bold uppercase tracking-widest text-ink-faint">
          En tu cuadro, ¿hasta dónde llegan?
        </p>
        <EliminationLine team={teams.get(realHomeTeamId)} res={realHomeElim} />
        <EliminationLine team={teams.get(realAwayTeamId)} res={realAwayElim} />
      </div>
    </details>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to `pronostico-cruce.tsx` or `stage-labels.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/components/results/pronostico-cruce.tsx src/lib/results/stage-labels.ts src/lib/results/stage-labels.test.ts
git commit -m "feat(results): componente PronosticoCruce con desplegable de rondas de eliminacion"
```

---

### Task 5: Resultados — marcador tipo tablón + PronosticoCruce

Aplica el marcador `FlapTile` (estilo grupos) y sustituye el chip "Local: en esta ronda" por `PronosticoCruce` en el cuadro de Resultados. Requiere pasar el cuadro del usuario y los IDs reales a la fila de resultados.

**Files:**
- Modify: `src/components/results/knockout-bracket-results.tsx`
- Modify: `src/app/(app)/resultados/page.tsx`

**Interfaces:**
- Consumes: `PronosticoCruce`, `FlapTile`, `buildUserBracket` output (`byMatchNumber`, `stageByMatchNumber`) already computed in `resultados/page.tsx` (Task references lines ~215).
- Produces: `KnockoutResultRow` extended with `matchNumber`, `homeTeamId`, `awayTeamId` (already has `matchNumber`; add team IDs).

- [ ] **Step 1: Extend `KnockoutResultRow` and rewrite the row rendering**

In `src/components/results/knockout-bracket-results.tsx`, replace the whole file with:

```tsx
"use client";

import { Flag } from "@/components/ui/flag";
import { FlapTile } from "@/components/ui/flap-tile";
import { stageLabel } from "@/lib/tournament/labels";
import { PronosticoCruce, type PronosticoCruceTeam } from "@/components/results/pronostico-cruce";
import type { PairingComparison } from "@/lib/results/knockout-comparison";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";

export interface KnockoutResultRow {
  matchNumber: number;
  stage: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  home: { name: string; flag_emoji: string } | null;
  away: { name: string; flag_emoji: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  comparison: PairingComparison | null;
}

const STAGE_ORDER = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];

export function KnockoutBracketResults({
  rows,
  bracket,
  stageByMatchNumber,
  teams,
}: {
  rows: KnockoutResultRow[];
  bracket: Map<number, PredictedKnockoutMatch>;
  stageByMatchNumber: Map<number, string>;
  teams: Map<number, PronosticoCruceTeam>;
}) {
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
          {group.matches.map((m) => {
            const played = m.homeScore !== null && m.awayScore !== null;
            return (
              <div key={m.matchNumber} className="space-y-1.5 rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {m.home ? <Flag emoji={m.home.flag_emoji} size={20} /> : null}
                    <span className="truncate text-sm font-bold text-ink">{m.home?.name ?? "TBD"}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {played ? (
                      <>
                        <FlapTile value={m.homeScore} size="sm" />
                        <FlapTile value={m.awayScore} size="sm" />
                      </>
                    ) : (
                      <span className="font-marcador text-xs font-bold text-ink-faint">VS</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
                    {m.away ? <Flag emoji={m.away.flag_emoji} size={20} /> : null}
                    <span className="truncate text-right text-sm font-bold text-ink">{m.away?.name ?? "TBD"}</span>
                  </div>
                </div>
                {m.homeTeamId !== null && m.awayTeamId !== null && (
                  <PronosticoCruce
                    matchNumber={m.matchNumber}
                    stage={m.stage}
                    realHomeTeamId={m.homeTeamId}
                    realAwayTeamId={m.awayTeamId}
                    bracket={bracket}
                    stageByMatchNumber={stageByMatchNumber}
                    teams={teams}
                    comparison={m.comparison}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

> **Nota:** `KnockoutComparisonChip` deja de exportarse desde este archivo. El siguiente step corrige el único consumidor (la fila de resultados finalizados en `resultados/page.tsx`).

- [ ] **Step 2: Update `resultados/page.tsx` — build rows with team IDs and pass bracket/teams**

In `src/app/(app)/resultados/page.tsx`:

1. In the `rows` builder (around line 316-340), add `homeTeamId` and `awayTeamId` to each row object:

```tsx
          return {
            matchNumber: m.match_number,
            stage: m.stage,
            homeTeamId: m.home_team_id,
            awayTeamId: m.away_team_id,
            home: home ? { name: home.name, flag_emoji: home.flag_emoji } : null,
            away: away ? { name: away.name, flag_emoji: away.flag_emoji } : null,
            homeScore: m.home_score,
            awayScore: m.away_score,
            comparison,
          };
```

2. Build a `teams` map for `PronosticoCruce` from `teamMap` and store the bracket in state so the render can pass them. Locate where component state is set (the `setKnockoutRows`/equivalent). Add state for the bracket and teams:

```tsx
// near other useState declarations
const [knockoutBracket, setKnockoutBracket] = useState<{
  byMatchNumber: Map<number, import("@/lib/scoring/qualification").PredictedKnockoutMatch>;
  stageByMatchNumber: Map<number, string>;
}>({ byMatchNumber: new Map(), stageByMatchNumber: new Map() });
const [pronosticoTeams, setPronosticoTeams] = useState<
  Map<number, { name: string; flag_emoji: string }>
>(new Map());
```

Inside `load()`, after `const { byMatchNumber, stageByMatchNumber } = buildUserBracket({...})`, set them:

```tsx
setKnockoutBracket({ byMatchNumber, stageByMatchNumber });
setPronosticoTeams(
  new Map(teams.map((t) => [t.id, { name: t.name, flag_emoji: t.flag_emoji }]))
);
```

3. Update the `<KnockoutBracketResults ... />` usage (in the "Cuadro" tab render) to pass the new props:

```tsx
<KnockoutBracketResults
  rows={knockoutRows}
  bracket={knockoutBracket.byMatchNumber}
  stageByMatchNumber={knockoutBracket.stageByMatchNumber}
  teams={pronosticoTeams}
/>
```

4. For the finished-match knockout card (around lines 485-506, which used `KnockoutComparisonChip`), replace the `<KnockoutComparisonChip comparison={m.comparison} />` block with `PronosticoCruce`. Import it at the top:

```tsx
import { PronosticoCruce } from "@/components/results/pronostico-cruce";
```

Replace the comparison block:

```tsx
                    <div className="mt-2 border-t border-dashed border-border pt-2">
                      {m.homeTeamIdReal != null && m.awayTeamIdReal != null ? (
                        <PronosticoCruce
                          matchNumber={m.match_number}
                          stage={m.stage}
                          realHomeTeamId={m.homeTeamIdReal}
                          realAwayTeamId={m.awayTeamIdReal}
                          bracket={knockoutBracket.byMatchNumber}
                          stageByMatchNumber={knockoutBracket.stageByMatchNumber}
                          teams={pronosticoTeams}
                          comparison={m.comparison}
                        />
                      ) : null}
                    </div>
```

To have `homeTeamIdReal`/`awayTeamIdReal` on `FinishedMatchDisplay`, extend that interface and populate it where `finished.push({...})` builds the object (around line 267): add `homeTeamIdReal: m.home_team_id, awayTeamIdReal: m.away_team_id,`. Find the `FinishedMatchDisplay` interface in this file and add:

```tsx
  homeTeamIdReal: number | null;
  awayTeamIdReal: number | null;
```

Also remove the now-unused `KnockoutComparisonChip` import if present.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors. Fix any type mismatches (the `FinishedMatchDisplay` interface must include the two new fields; the `KnockoutResultRow` import already carries team IDs).

Run: `npm run lint`
Expected: no new lint errors.

- [ ] **Step 4: Manual verification (build)**

Run: `npm run build`
Expected: build succeeds. (Verificación visual manual: en Resultados › Cuadro, los partidos de eliminatoria muestran marcador con tiles y un desplegable "Tu pronóstico" con banderas + rondas de eliminación; ya no aparece "Local: en esta ronda".)

- [ ] **Step 5: Commit**

```bash
git add src/components/results/knockout-bracket-results.tsx "src/app/(app)/resultados/page.tsx"
git commit -m "feat(resultados): marcador tablon + PronosticoCruce en cuadro y partidos finalizados"
```

---

### Task 6: "Próximos partidos" (upcoming strip) con cruce y banderas

Sustituye el badge crudo por `PronosticoCruce` en los partidos de eliminatoria del strip; grupos mantienen el badge simple.

**Files:**
- Modify: `src/components/results/upcoming-strip.tsx`
- Modify: `src/app/(app)/resultados/page.tsx` (pasar props al strip)

**Interfaces:**
- Consumes: `PronosticoCruce`; el cuadro del usuario y `teams` ya en estado (Task 5). `CalendarMatch` (tiene `home`, `away`, `stage`, `match_number`) — necesita IDs reales; se añaden opcionales `home_team_id`/`away_team_id` a `CalendarMatch`.

- [ ] **Step 1: Add real team IDs to `CalendarMatch`**

In `src/components/calendar/calendar-match-row.tsx`, extend the `CalendarMatch` interface:

```tsx
export interface CalendarMatch {
  id: number;
  match_number: number;
  stage: string;
  group_letter: string | null;
  match_date: string;
  is_finished: boolean;
  home_score: number | null;
  away_score: number | null;
  home: CalendarTeam | null;
  away: CalendarTeam | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  venue: { name: string; city: string } | null;
  prediction?: CalendarPrediction | null;
}
```

- [ ] **Step 2: Populate `home_team_id`/`away_team_id` wherever `CalendarMatch` is assembled**

In `src/app/(app)/resultados/page.tsx` (the `calendarMatches` map, ~line 288) add:

```tsx
            home_team_id: m.home_team_id,
            away_team_id: m.away_team_id,
```

In `src/app/(app)/calendario/page.tsx` (the `assembled` map, ~line 98) add the same two fields:

```tsx
            home_team_id: m.home_team_id,
            away_team_id: m.away_team_id,
```

- [ ] **Step 3: Update the upcoming strip to render `PronosticoCruce` for knockout matches**

In `src/components/results/upcoming-strip.tsx`, change the signature to accept the bracket and teams, and branch by stage:

```tsx
"use client";

import Link from "next/link";
import { Flag } from "@/components/ui/flag";
import { formatShortDay, formatKickoff } from "@/lib/datetime";
import { stageLabel } from "@/lib/tournament/labels";
import { PronosticoCruce, type PronosticoCruceTeam } from "@/components/results/pronostico-cruce";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";
import type {
  CalendarMatch,
  CalendarTeam,
} from "@/components/calendar/calendar-match-row";

function TeamLine({ team, placeholder }: { team: CalendarTeam | null; placeholder: string | null }) {
  return (
    <div className="flex items-center gap-1.5">
      {team ? (
        <>
          <Flag emoji={team.flag_emoji} size={16} />
          <span className="truncate text-xs font-bold text-ink">{team.name}</span>
        </>
      ) : (
        <span className="truncate font-marcador text-[10px] uppercase text-ink-faint">
          {placeholder ?? "—"}
        </span>
      )}
    </div>
  );
}

export function UpcomingStrip({
  matches,
  bracket,
  stageByMatchNumber,
  teams,
  limit = 5,
}: {
  matches: CalendarMatch[];
  bracket?: Map<number, PredictedKnockoutMatch>;
  stageByMatchNumber?: Map<number, string>;
  teams?: Map<number, PronosticoCruceTeam>;
  limit?: number;
}) {
  const upcoming = matches
    .filter((m) => !m.is_finished)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
    .slice(0, limit);

  if (upcoming.length === 0) return null;

  return (
    <div>
      <p className="px-1 pb-1.5 font-sans text-[9px] font-bold uppercase tracking-widest text-ink-faint">
        Próximos partidos
      </p>
      <div className="flex gap-2 overflow-x-auto px-1 pb-1">
        {upcoming.map((m) => {
          const isKnockout = m.stage !== "group";
          const canShowCruce =
            isKnockout &&
            bracket &&
            stageByMatchNumber &&
            teams &&
            m.home_team_id !== null &&
            m.away_team_id !== null;
          return (
            <Link
              key={m.id}
              href={`/resultados/predicciones?partido=${m.id}`}
              className="w-[170px] shrink-0 rounded-xl border border-border bg-surface p-2.5"
            >
              <p className="font-marcador text-[11px] font-bold uppercase text-ink">
                {formatShortDay(m.match_date)} · {formatKickoff(m.match_date)}
              </p>
              <p className="mt-0.5 font-sans text-[8px] font-bold uppercase tracking-widest text-ink-faint">
                {stageLabel(m.stage, m.group_letter)}
              </p>
              <div className="mt-1.5 space-y-1">
                <TeamLine team={m.home} placeholder={m.home_placeholder} />
                <TeamLine team={m.away} placeholder={m.away_placeholder} />
              </div>
              {canShowCruce ? (
                <div className="mt-2">
                  <PronosticoCruce
                    matchNumber={m.match_number}
                    stage={m.stage}
                    realHomeTeamId={m.home_team_id as number}
                    realAwayTeamId={m.away_team_id as number}
                    bracket={bracket!}
                    stageByMatchNumber={stageByMatchNumber!}
                    teams={teams!}
                  />
                </div>
              ) : (
                m.prediction && (
                  <div className="mt-2 rounded-lg border border-blue/30 bg-blue/10 px-2 py-1">
                    <p className="font-marcador text-[9px] font-bold uppercase tracking-wider text-blue">
                      Tu {m.prediction.home}-{m.prediction.away}
                    </p>
                  </div>
                )
              )}
              {m.venue && (
                <p className="mt-1.5 truncate border-t border-dashed border-border pt-1.5 text-[9px] text-ink-muted">
                  {m.venue.city}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Pass the bracket and teams into `<UpcomingStrip />` from `resultados/page.tsx`**

Find the `<UpcomingStrip matches={...} />` usage and extend it:

```tsx
<UpcomingStrip
  matches={calendarMatches}
  bracket={knockoutBracket.byMatchNumber}
  stageByMatchNumber={knockoutBracket.stageByMatchNumber}
  teams={pronosticoTeams}
/>
```

- [ ] **Step 5: Typecheck, lint, build**

Run: `npx tsc --noEmit` — Expected: no errors (every `CalendarMatch` literal must now include `home_team_id`/`away_team_id`; if the build flags another assembly site, add the two fields there too).
Run: `npm run lint` — Expected: no new errors.
Run: `npm run build` — Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/components/results/upcoming-strip.tsx src/components/calendar/calendar-match-row.tsx "src/app/(app)/resultados/page.tsx" "src/app/(app)/calendario/page.tsx"
git commit -m "feat(resultados): proximos partidos de eliminatoria con cruce y banderas"
```

---

### Task 7: Calendario — cruce con banderas + desplegable

En "Tú pronóstico" del calendario, para partidos de eliminatoria mostrar `PronosticoCruce` en vez del badge crudo; grupos mantienen el badge.

**Files:**
- Modify: `src/app/(app)/calendario/page.tsx`
- Modify: `src/components/calendar/calendar-match-row.tsx`
- Modify: `src/components/calendar/match-calendar.tsx` (para pasar props hacia las filas)

**Interfaces:**
- Consumes: `loadUserBracket` (Task 3), `PronosticoCruce`. `MatchCalendar` recibe y propaga `bracket`, `stageByMatchNumber`, `teams` a cada `CalendarMatchRow`.

- [ ] **Step 1: Load the user bracket in the calendar page**

In `src/app/(app)/calendario/page.tsx`:

1. Add imports:

```tsx
import { loadUserBracket } from "@/lib/results/load-user-bracket";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";
import type { PronosticoCruceTeam } from "@/components/results/pronostico-cruce";
```

2. Add state:

```tsx
const [bracket, setBracket] = useState<Map<number, PredictedKnockoutMatch>>(new Map());
const [stageByMatchNumber, setStageByMatchNumber] = useState<Map<number, string>>(new Map());
const [pronosticoTeams, setPronosticoTeams] = useState<Map<number, PronosticoCruceTeam>>(new Map());
```

3. Inside `load()`, after the matches (`matchesRes`) and predictions are fetched, call the loader. `matchesRes.data` rows have `id, match_number, stage, home_placeholder, away_placeholder`; predictions rows have `match_id, home_score, away_score`. Add after `setMatches(...)`:

```tsx
if (uid) {
  const rawMatches = ((matchesRes.data ?? []) as MatchRow[]).map((m) => ({
    id: m.id,
    match_number: m.match_number,
    stage: m.stage,
    home_placeholder: m.home_placeholder,
    away_placeholder: m.away_placeholder,
  }));
  const built = await loadUserBracket(
    supabase,
    uid,
    rawMatches,
    (predictionsRes.data ?? []) as PredictionRow[]
  );
  setBracket(built.byMatchNumber);
  setStageByMatchNumber(built.stageByMatchNumber);
  setPronosticoTeams(
    new Map((teamsRes as TeamRow[]).map((t) => [t.id, { name: t.name, flag_emoji: t.flag_emoji }]))
  );
}
```

- [ ] **Step 2: Thread props through `MatchCalendar` to `CalendarMatchRow`**

Read `src/components/calendar/match-calendar.tsx` first. Add optional props to its component signature and pass them to each `<CalendarMatchRow>`:

```tsx
export function MatchCalendar({
  matches,
  bracket,
  stageByMatchNumber,
  teams,
}: {
  matches: CalendarMatch[];
  bracket?: Map<number, PredictedKnockoutMatch>;
  stageByMatchNumber?: Map<number, string>;
  teams?: Map<number, PronosticoCruceTeam>;
}) {
  // ...existing grouping-by-day logic unchanged...
  // wherever it renders <CalendarMatchRow match={m} />, change to:
  // <CalendarMatchRow match={m} bracket={bracket} stageByMatchNumber={stageByMatchNumber} teams={teams} />
}
```

Add the imports for `PredictedKnockoutMatch` and `PronosticoCruceTeam` at the top of `match-calendar.tsx`.

- [ ] **Step 3: Render `PronosticoCruce` in `CalendarMatchRow`**

In `src/components/calendar/calendar-match-row.tsx`:

1. Add imports:

```tsx
import { PronosticoCruce, type PronosticoCruceTeam } from "@/components/results/pronostico-cruce";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";
```

2. Change the component signature:

```tsx
export function CalendarMatchRow({
  match,
  bracket,
  stageByMatchNumber,
  teams,
}: {
  match: CalendarMatch;
  bracket?: Map<number, PredictedKnockoutMatch>;
  stageByMatchNumber?: Map<number, string>;
  teams?: Map<number, PronosticoCruceTeam>;
}) {
```

3. Replace the existing `{match.prediction && (...)}` block (lines 122-131) with a stage-aware branch:

```tsx
      {match.stage !== "group" &&
      bracket &&
      stageByMatchNumber &&
      teams &&
      match.home_team_id !== null &&
      match.away_team_id !== null ? (
        <div className="mt-2">
          <PronosticoCruce
            matchNumber={match.match_number}
            stage={match.stage}
            realHomeTeamId={match.home_team_id}
            realAwayTeamId={match.away_team_id}
            bracket={bracket}
            stageByMatchNumber={stageByMatchNumber}
            teams={teams}
          />
        </div>
      ) : (
        match.prediction && (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-blue/30 bg-blue/10 px-2 py-1.5">
            <span className="font-marcador text-[10px] font-bold uppercase tracking-wider text-blue">
              Tu pronostico
            </span>
            <span className="font-marcador text-sm font-bold text-ink">
              {match.prediction.home} - {match.prediction.away}
            </span>
          </div>
        )
      )}
```

- [ ] **Step 4: Pass props from the calendar page into `MatchCalendar`**

In `src/app/(app)/calendario/page.tsx`, update the render:

```tsx
<MatchCalendar
  matches={filtered}
  bracket={bracket}
  stageByMatchNumber={stageByMatchNumber}
  teams={pronosticoTeams}
/>
```

- [ ] **Step 5: Typecheck, lint, build**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run lint` — Expected: no new errors.
Run: `npm run build` — Expected: success.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/calendario/page.tsx" src/components/calendar/calendar-match-row.tsx src/components/calendar/match-calendar.tsx
git commit -m "feat(calendario): cruce con banderas + desplegable de eliminacion en Tu pronostico"
```

---

### Task 8: Detalle de partido — cruce y desplegable

En `resultados/predicciones`, para el partido seleccionado de eliminatoria, el bloque "Tu pronóstico" muestra el cruce que lleva el usuario (banderas + marcador) y desplegable de rondas.

**Files:**
- Modify: `src/app/(app)/resultados/predicciones/page.tsx`

**Interfaces:**
- Consumes: `loadUserBracket`, `PronosticoCruce`. La página ya carga `matches`, `teams`; carga las predicciones del usuario para construir el cuadro.

- [ ] **Step 1: Load the user bracket in the detail page**

In `src/app/(app)/resultados/predicciones/page.tsx`:

1. Add imports:

```tsx
import { loadUserBracket } from "@/lib/results/load-user-bracket";
import { PronosticoCruce, type PronosticoCruceTeam } from "@/components/results/pronostico-cruce";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";
```

2. Add state:

```tsx
const [bracket, setBracket] = useState<Map<number, PredictedKnockoutMatch>>(new Map());
const [stageByMatchNumber, setStageByMatchNumber] = useState<Map<number, string>>(new Map());
const [pronosticoTeams, setPronosticoTeams] = useState<Map<number, PronosticoCruceTeam>>(new Map());
```

3. In the first `load()` effect, after `setMatches(loadedMatches)` and teams are set, fetch the current user's own predictions and build the bracket. Add:

```tsx
if (uid) {
  const { data: myPreds } = await supabase
    .from("match_predictions")
    .select("match_id, home_score, away_score, penalty_winner")
    .eq("user_id", uid);
  const rawMatches = loadedMatches.map((m) => ({
    id: m.id,
    match_number: m.match_number,
    stage: m.stage,
    home_placeholder: m.home_placeholder,
    away_placeholder: m.away_placeholder,
  }));
  const built = await loadUserBracket(
    supabase,
    uid,
    rawMatches,
    (myPreds ?? []) as { match_id: number; home_score: number; away_score: number; penalty_winner?: "home" | "away" | null }[]
  );
  setBracket(built.byMatchNumber);
  setStageByMatchNumber(built.stageByMatchNumber);
  setPronosticoTeams(
    new Map(((teamRows ?? []) as TeamRow[]).map((t) => [t.id, { name: t.name, flag_emoji: t.flag_emoji }]))
  );
}
```

- [ ] **Step 2: Render `PronosticoCruce` in the "Tu pronóstico" block for knockout**

In the JSX, inside the `{currentUserProfile && (...)}` block (lines 293-321), branch by stage. Replace that block's inner content so that for a knockout `selectedMatch` with real team IDs it shows `PronosticoCruce`, otherwise the existing raw prediction card:

```tsx
          {currentUserProfile && selectedMatch && selectedMatch.stage !== "group" &&
          selectedMatch.home_team_id !== null && selectedMatch.away_team_id !== null ? (
            <div className="mb-3">
              <PronosticoCruce
                matchNumber={selectedMatch.match_number}
                stage={selectedMatch.stage}
                realHomeTeamId={selectedMatch.home_team_id}
                realAwayTeamId={selectedMatch.away_team_id}
                bracket={bracket}
                stageByMatchNumber={stageByMatchNumber}
                teams={pronosticoTeams}
              />
            </div>
          ) : currentUserProfile ? (
            <div className="mb-3 rounded-xl border border-blue/40 bg-blue/10 p-3">
              {/* ...existing raw prediction block unchanged... */}
            </div>
          ) : null}
```

Keep the existing raw-prediction markup (the `home_score - away_score` + "Pasa …" penalty label) verbatim inside the middle branch — it still serves group-stage matches and knockout matches whose real teams aren't set yet.

- [ ] **Step 3: Typecheck, lint, build**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run lint` — Expected: no new errors.
Run: `npm run build` — Expected: success.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/resultados/predicciones/page.tsx"
git commit -m "feat(detalle): cruce con banderas + desplegable de eliminacion en Tu pronostico"
```

---

### Task 9: Clasificados por ronda en el desglose de puntos

Deriva de `score_events` (fuente autoritativa) el desglose de clasificados **por ronda**, con selecciones y puntos, y lo muestra en `PointsAudit`.

**Files:**
- Modify: `src/lib/results/points-audit.ts`
- Test: `src/lib/results/points-audit.test.ts` (añadir casos)
- Modify: `src/components/profile/points-audit.tsx`
- Modify: `src/app/(app)/jugador/[id]/page.tsx`

**Interfaces:**
- Produces (in `points-audit.ts`):
  ```ts
  interface QualifiedRoundRow { ruleKey: string; label: string; teamIds: number[]; points: number; }
  function auditQualifiedByRound(
    events: Array<{ rule_key: string; points: number; description: string | null }>
  ): QualifiedRoundRow[];
  ```
- Consumes: `PointsAudit` gains prop `qualifiedByRound: QualifiedRoundRow[]` (replaces the flat `qualified` prop).

- [ ] **Step 1: Write the failing test**

Add to `src/lib/results/points-audit.test.ts`:

```ts
import { auditQualifiedByRound } from "./points-audit";

test("auditQualifiedByRound groups qualify_* events by round with team ids and points", () => {
  const events = [
    { rule_key: "qualify_r32", points: 1, description: "Equipo 10 clasificado a round_of_32" },
    { rule_key: "qualify_r32", points: 1, description: "Equipo 20 clasificado a round_of_32" },
    { rule_key: "qualify_r16", points: 3, description: "Equipo 10 clasificado a round_of_16" },
    { rule_key: "qualify_champion", points: 25, description: "Equipo 10 clasificado a final_winner" },
    { rule_key: "correct_sign", points: 1, description: "no cuenta" },
  ];
  const rows = auditQualifiedByRound(events);

  // Solo rondas de clasificación, en orden fijo
  assert.deepEqual(
    rows.map((r) => r.ruleKey),
    ["qualify_r32", "qualify_r16", "qualify_champion"]
  );
  const r32 = rows.find((r) => r.ruleKey === "qualify_r32")!;
  assert.deepEqual(r32.teamIds, [10, 20]);
  assert.equal(r32.points, 2);
  assert.equal(r32.label, "Dieciseisavos");
  const champ = rows.find((r) => r.ruleKey === "qualify_champion")!;
  assert.deepEqual(champ.teamIds, [10]);
  assert.equal(champ.points, 25);
  assert.equal(champ.label, "Campeón");
});

test("auditQualifiedByRound returns [] when no qualify events", () => {
  assert.deepEqual(auditQualifiedByRound([{ rule_key: "correct_sign", points: 1, description: "x" }]), []);
});
```

Add the import at the top of the test file alongside existing imports.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/results/points-audit.test.ts`
Expected: FAIL — `auditQualifiedByRound` is not exported.

- [ ] **Step 3: Implement `auditQualifiedByRound`**

Append to `src/lib/results/points-audit.ts`:

```ts
export interface QualifiedRoundRow {
  ruleKey: string;
  label: string;
  teamIds: number[];
  points: number;
}

const QUALIFY_ROUND_ORDER = [
  "qualify_r32",
  "qualify_r16",
  "qualify_qf",
  "qualify_sf",
  "qualify_finalist",
  "qualify_champion",
  "qualify_runner_up",
  "qualify_third",
  "qualify_fourth",
];

const QUALIFY_LABELS: Record<string, string> = {
  qualify_r32: "Dieciseisavos",
  qualify_r16: "Octavos",
  qualify_qf: "Cuartos",
  qualify_sf: "Semifinales",
  qualify_finalist: "Finalistas",
  qualify_champion: "Campeón",
  qualify_runner_up: "Subcampeón",
  qualify_third: "Tercer puesto",
  qualify_fourth: "Cuarto puesto",
};

// Agrupa los eventos `qualify_*` por ronda. Los team ids se extraen de la
// descripción ("Equipo {id} clasificado a ...") escrita por scoreQualification.
export function auditQualifiedByRound(
  events: Array<{ rule_key: string; points: number; description: string | null }>
): QualifiedRoundRow[] {
  const byRule = new Map<string, { teamIds: number[]; points: number }>();
  for (const e of events) {
    if (!e.rule_key.startsWith("qualify_")) continue;
    const bucket = byRule.get(e.rule_key) ?? { teamIds: [], points: 0 };
    const match = /Equipo (\d+)/.exec(e.description ?? "");
    if (match) bucket.teamIds.push(Number(match[1]));
    bucket.points += e.points;
    byRule.set(e.rule_key, bucket);
  }

  return QUALIFY_ROUND_ORDER.filter((ruleKey) => byRule.has(ruleKey)).map((ruleKey) => {
    const bucket = byRule.get(ruleKey)!;
    return {
      ruleKey,
      label: QUALIFY_LABELS[ruleKey] ?? ruleKey,
      teamIds: bucket.teamIds,
      points: bucket.points,
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/results/points-audit.test.ts`
Expected: PASS (all, including the two new tests).

- [ ] **Step 5: Update `PointsAudit` to render per-round clasificados**

In `src/components/profile/points-audit.tsx`:

1. Add the import and prop type:

```tsx
import type { QualifiedRoundRow } from "@/lib/results/points-audit";
```

2. Replace `qualified` in `PointsAuditProps` with:

```tsx
  qualifiedByRound: QualifiedRoundRow[];
```

3. Replace `qualified` in the destructured params with `qualifiedByRound`.

4. Replace the entire "Clasificados" `<Section>` (lines ~191-219) with:

```tsx
      {/* Clasificados por ronda */}
      <Section
        type="clasificados"
        points={qualifiedByRound.reduce((s, r) => s + r.points, 0)}
      >
        {qualifiedByRound.length === 0 ? (
          <p className="py-1 text-xs italic text-ink-muted">Sin clasificados puntuados todavía.</p>
        ) : (
          <div className="space-y-2">
            {qualifiedByRound.map((round) => (
              <div key={round.ruleKey}>
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="font-marcador text-[11px] uppercase text-ink-muted">{round.label}</span>
                  <span className="font-marcador text-[11px] font-bold text-ink">+{round.points}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {round.teamIds.map((teamId, i) => {
                    const team = teamLabel(teams, teamId);
                    return (
                      <span
                        key={`${teamId}-${i}`}
                        className="flex items-center gap-1 rounded-md bg-green/10 px-1.5 py-1 text-[11px] font-semibold text-green"
                      >
                        {team.flag && <Flag emoji={team.flag} size={14} />}
                        {team.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
```

Remove the now-unused `QualifiedAuditRow` import if it's no longer referenced.

- [ ] **Step 6: Update `jugador/[id]/page.tsx` to compute and pass `qualifiedByRound`**

In `src/app/(app)/jugador/[id]/page.tsx`:

1. Change the import:

```tsx
import { auditGroupMatches, auditGroupOrder, auditQualifiedByRound } from "@/lib/results/points-audit";
```

2. Remove the `qualifiedAudit` block (lines ~682-698) and replace with:

```tsx
  const qualifiedByRound = auditQualifiedByRound(scoreEvents);
```

3. In the `<PointsAudit ... />` usage, replace `qualified={qualifiedAudit}` with:

```tsx
        qualifiedByRound={qualifiedByRound}
```

(The `predictedBracketMatches`/`predictedR32TeamIds` computations that fed the old audit can stay if used elsewhere — they are also used for the bracket view — so leave them; only the `auditQualified` call and its output are removed.)

- [ ] **Step 7: Typecheck, lint, build**

Run: `npx tsc --noEmit` — Expected: no errors. If `auditQualified`/`QualifiedAuditRow` become unused, remove leftover imports.
Run: `npm run lint` — Expected: no new errors.
Run: `npm run build` — Expected: success.

- [ ] **Step 8: Commit**

```bash
git add src/lib/results/points-audit.ts src/lib/results/points-audit.test.ts src/components/profile/points-audit.tsx "src/app/(app)/jugador/[id]/page.tsx"
git commit -m "feat(perfil): desglose de clasificados por ronda en el resumen de puntos"
```

---

### Task 10: Acceso al resumen de puntuaciones desde Porra y Mi Cuenta

Enlaces prominentes al desglose propio (`/jugador/{miId}`) desde la porra y la cuenta.

**Files:**
- Modify: `src/app/(app)/porra/page.tsx`
- Modify: `src/app/(app)/mi-cuenta/page.tsx`

**Interfaces:**
- Consumes: el `user.id` (porra: server, `user!.id`; mi-cuenta: `profile.id`).

- [ ] **Step 1: Add a summary link card in Porra**

In `src/app/(app)/porra/page.tsx`, add a card in the render (after the global progress card, within the returned JSX). `user!.id` is available in scope:

```tsx
      <Link
        href={`/jugador/${user!.id}`}
        className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <BarChart2 className="h-5 w-5 text-blue" />
          <div>
            <p className="font-marcador text-sm font-bold uppercase text-ink">Mis puntuaciones</p>
            <p className="text-[11px] text-ink-muted">Desglose por signo, orden, clasificados, exacto y premios</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-ink-faint" />
      </Link>
```

`BarChart2`, `ChevronRight` and `Link` are already imported in this file (verified in the header imports).

- [ ] **Step 2: Add a summary link in Mi Cuenta**

In `src/app/(app)/mi-cuenta/page.tsx`:

1. Add imports at the top:

```tsx
import Link from "next/link";
```

2. After the profile `<Card>` (before "Sign out" button), add:

```tsx
      <Link
        href={`/jugador/${profile.id}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
      >
        <div>
          <p className="font-marcador text-sm font-bold uppercase text-ink">Mis puntuaciones</p>
          <p className="text-xs text-ink-muted">Ver el desglose completo de mis puntos</p>
        </div>
        <span className="font-marcador text-lg text-ink-faint">›</span>
      </Link>
```

- [ ] **Step 3: Typecheck, lint, build**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run lint` — Expected: no new errors.
Run: `npm run build` — Expected: success.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/porra/page.tsx" "src/app/(app)/mi-cuenta/page.tsx"
git commit -m "feat(porra,cuenta): acceso al resumen de puntuaciones desde perfil y porra"
```

---

### Task 11: Verificación final

- [ ] **Step 1: Run the full logic test suite**

Run:
```bash
npx tsx --test src/lib/results/elimination-round.test.ts src/lib/results/stage-labels.test.ts src/lib/scoring/knockout-wrong-pairing.test.ts src/lib/results/points-audit.test.ts
```
Expected: all PASS.

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: success, no type errors.

- [ ] **Step 3: Manual smoke (optional, requires dev server + real data)**

Run `npm run dev` and confirm, en un usuario con predicciones de eliminatoria:
- Calendario › eliminatorias: cada partido muestra desplegable "Tu pronóstico" con banderas + rondas.
- Resultados › Cuadro y Próximos partidos: marcador tablón + desplegable; sin "Local: en esta ronda".
- Detalle de un partido de eliminatoria: bloque "Tu pronóstico" con cruce + desplegable.
- Perfil (jugador propio): "Clasificados" desglosado por ronda; "Eliminatorias (exacto)" visible.
- Porra y Mi Cuenta: enlace "Mis puntuaciones" lleva al desglose.

- [ ] **Step 4: Final commit (if any manual fixes)**

```bash
git add -A
git commit -m "chore: verificacion final cruce pronostico eliminatorias"
```

---

## Self-Review

**Spec coverage:**
- Calendario cruce + banderas + desplegable con rondas → Task 7 (+ Task 4 componente). ✓
- Resultados: quitar "Local: en esta ronda" + país + rondas → Task 5. ✓
- Resultados › Próximos partidos con banderas + cruce → Task 6. ✓
- Estilo marcador tablón (FlapTile) en eliminatorias → Task 5. ✓
- Detalle de partido: cruce + desplegable → Task 8. ✓
- Verificar no dar puntos por cruce equivocado → Task 2 (diagnóstico: bug de visualización, scoring correcto; test de regresión). ✓
- Resumen de puntuaciones accesible desde perfil y porra → Task 10. ✓
- Puntos por resultado exacto en eliminatoria → ya existe en `PointsAudit` (sección "Eliminatorias (exacto)"), visible desde los accesos de Task 10. ✓
- Puntos por selecciones clasificadas para cada ronda → Task 9. ✓

**Type consistency:** `BuiltUserBracket` = `{ byMatchNumber, stageByMatchNumber }` usado consistentemente. `PronosticoCruceProps.matchNumber` es el `match_number` real (clave del cuadro). `PronosticoCruceTeam` reutilizado en todos los llamantes. `QualifiedRoundRow` producido en Task 9 y consumido por `PointsAudit`.

**Placeholders:** ninguno pendiente; todo el código está completo por paso.
