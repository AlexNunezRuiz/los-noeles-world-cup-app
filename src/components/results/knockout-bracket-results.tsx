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
