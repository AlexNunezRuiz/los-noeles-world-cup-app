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
  ["qualification", "qualify_finalist", 15, "Equipo finalista", "Equipo clasificado a la final"],
  ["qualification", "qualify_champion", 25, "Campeon del torneo acertado", "Acertar campeon"],
  ["qualification", "qualify_third", 12, "3er puesto acertado", "Acertar tercer puesto"],
  ["knockout_exact", "exact_r32", 2, "Resultado exacto en dieciseisavos", "Resultado exacto en dieciseisavos con cruce acertado"],
  ["knockout_exact", "exact_r16", 3, "Resultado exacto en octavos", "Resultado exacto en octavos con cruce acertado"],
  ["knockout_exact", "exact_qf", 5, "Resultado exacto en cuartos", "Resultado exacto en cuartos con cruce acertado"],
  ["knockout_exact", "exact_sf", 7, "Resultado exacto en semifinales", "Resultado exacto en semifinales con cruce acertado"],
  ["knockout_exact", "exact_third", 8, "Resultado exacto en 3er puesto", "Resultado exacto 3er puesto con cruce acertado"],
  ["knockout_exact", "exact_final", 10, "Resultado exacto en la final", "Resultado exacto en la final con cruce acertado"],
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

export function getScoringRuleLabel(ruleKey: string, fallback?: string): string {
  return RULE_LABELS.get(ruleKey) ?? fallback ?? ruleKey;
}
