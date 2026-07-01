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
