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
