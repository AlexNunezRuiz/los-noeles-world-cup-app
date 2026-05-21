"use client";

import { Flag } from "@/components/ui/flag";
import { FlapTile } from "@/components/ui/flap-tile";
import { Badge } from "@/components/ui/badge";

interface Team {
  name: string;
  flag_emoji: string;
}

interface MatchResultCardProps {
  label: string;
  live?: boolean;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  prediction?: { home: number; away: number } | null;
  outcome?: "exacto" | "signo" | "fallo" | null;
  points?: number;
}

export function MatchResultCard({
  label,
  live,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  prediction,
  outcome,
  points,
}: MatchResultCardProps) {
  return (
    <div
      className={`rounded-xl border bg-surface p-3 ${
        live ? "border-red ring-[3px] ring-red/10" : "border-border"
      }`}
    >
      <p className="font-sans text-[8px] font-bold uppercase tracking-widest text-ink-faint">{label}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Flag emoji={homeTeam.flag_emoji} size={22} />
          <span className="truncate text-sm font-bold text-ink">{homeTeam.name}</span>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <FlapTile value={homeScore} size="sm" />
          <FlapTile value={awayScore} size="sm" />
        </div>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
          <Flag emoji={awayTeam.flag_emoji} size={22} />
          <span className="truncate text-right text-sm font-bold text-ink">{awayTeam.name}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2">
        <span className="text-[10px] font-semibold text-ink-muted">
          {prediction ? (
            <>
              Tu pronóstico:{" "}
              <b className="font-marcador text-ink">
                {prediction.home}–{prediction.away}
              </b>
            </>
          ) : (
            "Sin pronóstico"
          )}
        </span>
        {outcome === "exacto" && <Badge variant="success">✓ Exacto +{points}</Badge>}
        {outcome === "signo" && <Badge variant="success-soft">✓ Signo +{points}</Badge>}
        {outcome === "fallo" && <Badge variant="secondary">Fallo · 0</Badge>}
      </div>
    </div>
  );
}
