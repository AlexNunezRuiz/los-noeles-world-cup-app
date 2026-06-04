export type ScoringCategory = "group_stage" | "qualification" | "knockout_exact" | "awards";

export interface DefaultScoringRule {
  category: ScoringCategory;
  ruleKey: string;
  points: number;
  label: string;
  description: string;
}

export const SCORING_CATEGORY_LABELS: Record<ScoringCategory, string> = {
  group_stage: "Fase de grupos",
  qualification: "Clasificacion por ronda",
  knockout_exact: "Eliminatorias - resultado exacto",
  awards: "Premios individuales",
};

export const SCORING_CATEGORY_ORDER: ScoringCategory[] = [
  "group_stage",
  "qualification",
  "knockout_exact",
  "awards",
];

export const DEFAULT_SCORING_RULES: DefaultScoringRule[] = [
  ["group_stage", "correct_sign", 1, "Signo correcto (1X2)", "Acertar signo 1X2 en fase de grupos"],
  ["group_stage", "exact_score", 1, "Resultado exacto en grupos", "Resultado exacto en fase de grupos (+1 adicional)"],
  ["group_stage", "group_pos_1st", 1, "1o de grupo acertado", "Acertar 1o de grupo"],
  ["group_stage", "group_pos_2nd", 1, "2o de grupo acertado", "Acertar 2o de grupo"],
  ["group_stage", "group_pos_3rd", 2, "3o de grupo acertado", "Acertar 3o de grupo"],
  ["group_stage", "group_pos_4th", 2, "4o de grupo acertado", "Acertar 4o de grupo"],
  ["qualification", "qualify_r32", 1, "Equipo clasificado a dieciseisavos", "Equipo clasificado a dieciseisavos"],
  ["qualification", "qualify_r16", 3, "Equipo clasificado a octavos", "Equipo clasificado a octavos"],
  ["qualification", "qualify_qf", 6, "Equipo clasificado a cuartos", "Equipo clasificado a cuartos"],
  ["qualification", "qualify_sf", 10, "Equipo clasificado a semifinales", "Equipo clasificado a semifinales"],
  ["qualification", "qualify_fourth", 10, "4o puesto acertado", "Acertar cuarto clasificado"],
  ["qualification", "qualify_third", 12, "3er puesto acertado", "Acertar tercer puesto"],
  ["qualification", "qualify_runner_up", 18, "Subcampeon acertado", "Acertar subcampeon"],
  ["qualification", "qualify_champion", 25, "Campeon del torneo acertado", "Acertar campeon"],
  ["qualification", "qualify_finalist", 15, "Equipo finalista", "Equipo clasificado a la final"],
  ["knockout_exact", "exact_r32", 2, "Resultado exacto y cruce en dieciseisavos", "Resultado exacto en dieciseisavos con cruce exacto acertado"],
  ["knockout_exact", "exact_r16", 3, "Resultado exacto y cruce en octavos", "Resultado exacto en octavos con cruce exacto acertado"],
  ["knockout_exact", "exact_qf", 5, "Resultado exacto y cruce en cuartos", "Resultado exacto en cuartos con cruce exacto acertado"],
  ["knockout_exact", "exact_sf", 7, "Resultado exacto y cruce en semifinales", "Resultado exacto en semifinales con cruce exacto acertado"],
  ["knockout_exact", "exact_third", 8, "Resultado exacto y cruce en 3er puesto", "Resultado exacto 3er puesto con cruce exacto acertado"],
  ["knockout_exact", "exact_final", 10, "Resultado exacto y cruce en la final", "Resultado exacto en la final con cruce exacto acertado"],
  ["awards", "golden_boot", 10, "Bota de Oro acertada", "Acertar Bota de Oro"],
  ["awards", "golden_ball", 10, "Balon de Oro acertado", "Acertar Balon de Oro"],
  ["awards", "golden_glove", 10, "Guante de Oro acertado", "Acertar Guante de Oro"],
].map(([category, ruleKey, points, label, description]) => ({
  category: category as ScoringCategory,
  ruleKey: ruleKey as string,
  points: points as number,
  label: label as string,
  description: description as string,
}));

const RULE_LABELS = new Map(DEFAULT_SCORING_RULES.map((rule) => [rule.ruleKey, rule.label]));
const RULE_ORDER = new Map(DEFAULT_SCORING_RULES.map((rule, index) => [rule.ruleKey, index]));

interface SortableScoringRule {
  category: string;
  rule_key?: string;
  ruleKey?: string;
}

export function getScoringRuleLabel(ruleKey: string, fallback?: string): string {
  return RULE_LABELS.get(ruleKey) ?? fallback ?? ruleKey;
}

export function compareScoringRules(a: SortableScoringRule, b: SortableScoringRule) {
  const aCategoryOrder = SCORING_CATEGORY_ORDER.indexOf(a.category as ScoringCategory);
  const bCategoryOrder = SCORING_CATEGORY_ORDER.indexOf(b.category as ScoringCategory);
  const categoryDiff =
    (aCategoryOrder === -1 ? Number.MAX_SAFE_INTEGER : aCategoryOrder) -
    (bCategoryOrder === -1 ? Number.MAX_SAFE_INTEGER : bCategoryOrder);
  if (categoryDiff !== 0) return categoryDiff;

  const aRuleKey = a.rule_key ?? a.ruleKey ?? "";
  const bRuleKey = b.rule_key ?? b.ruleKey ?? "";
  const ruleDiff =
    (RULE_ORDER.get(aRuleKey) ?? Number.MAX_SAFE_INTEGER) -
    (RULE_ORDER.get(bRuleKey) ?? Number.MAX_SAFE_INTEGER);
  if (ruleDiff !== 0) return ruleDiff;

  return aRuleKey.localeCompare(bRuleKey, "es");
}
