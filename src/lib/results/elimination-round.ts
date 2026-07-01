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
