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

export function KnockoutComparisonChip({ comparison }: { comparison: PairingComparison | null }) {
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
                <KnockoutComparisonChip comparison={m.comparison} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
