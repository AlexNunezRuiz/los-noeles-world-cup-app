// Single source of truth that maps each scoring `rule_key` to one of the six
// breakdown "types" shown in the ranking and profile. The SQL view
// `user_score_breakdown` (migration 029) mirrors this exact mapping, so the
// aggregated numbers and the per-event detail can never disagree.

export type BreakdownType =
  | "signo"
  | "exacto"
  | "orden"
  | "clasificados"
  | "eliminatorias"
  | "premios";

export const BREAKDOWN_TYPES: BreakdownType[] = [
  "signo",
  "exacto",
  "orden",
  "clasificados",
  "eliminatorias",
  "premios",
];

export const BREAKDOWN_META: Record<
  BreakdownType,
  { label: string; short: string; color: string }
> = {
  signo: { label: "Signo (1X2)", short: "Signo", color: "var(--red)" },
  exacto: { label: "Resultado exacto", short: "Exacto", color: "var(--amber)" },
  orden: { label: "Orden de grupos", short: "Orden", color: "var(--green)" },
  clasificados: { label: "Clasificados", short: "Clasif.", color: "var(--blue)" },
  eliminatorias: { label: "Eliminatorias (exacto)", short: "Elim.", color: "#7c3aed" },
  premios: { label: "Premios", short: "Premios", color: "var(--gold)" },
};

const AWARD_RULE_KEYS = new Set(["golden_boot", "golden_ball", "golden_glove"]);

export function ruleKeyToBreakdownType(ruleKey: string): BreakdownType | null {
  // Order matters: `exact_score` must be matched before the generic `exact_*`.
  if (ruleKey === "correct_sign") return "signo";
  if (ruleKey === "exact_score") return "exacto";
  if (ruleKey.startsWith("group_pos_")) return "orden";
  if (ruleKey.startsWith("qualify_")) return "clasificados";
  if (ruleKey.startsWith("exact_")) return "eliminatorias";
  if (AWARD_RULE_KEYS.has(ruleKey)) return "premios";
  return null;
}

export interface BreakdownEvent {
  rule_key: string;
  points: number;
}

export function emptyBreakdown(): Record<BreakdownType, number> {
  return { signo: 0, exacto: 0, orden: 0, clasificados: 0, eliminatorias: 0, premios: 0 };
}

export function aggregateBreakdown(events: BreakdownEvent[]): Record<BreakdownType, number> {
  const totals = emptyBreakdown();
  for (const event of events) {
    const type = ruleKeyToBreakdownType(event.rule_key);
    if (type) totals[type] += event.points;
  }
  return totals;
}
