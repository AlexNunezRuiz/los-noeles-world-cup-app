"use client";

import { cn } from "@/lib/utils";
import { Flag } from "@/components/ui/flag";
import { FlapTile } from "@/components/ui/flap-tile";

interface Team {
  name: string;
  flag_emoji: string;
}

interface MatchCardProps {
  matchNumber: number;
  matchDate?: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  saved?: boolean;
  active?: boolean;
  focusedSide?: "home" | "away" | null;
  onTileTap: (side: "home" | "away") => void;
}

function formatDate(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchCard({
  matchNumber,
  matchDate,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  saved,
  active,
  focusedSide,
  onTileTap,
}: MatchCardProps) {
  const date = formatDate(matchDate);
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-3",
        active ? "border-red ring-[3px] ring-red/10" : "border-border"
      )}
    >
      <p className="text-center text-[9px] font-bold uppercase tracking-wider text-ink-faint">
        <span className="font-marcador text-[11px] text-ink-muted">
          Nº {String(matchNumber).padStart(2, "0")}
        </span>
        {date ? ` · ${date}` : ""}
        {saved ? <span className="text-green"> · ✓ guardado</span> : null}
      </p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Flag emoji={homeTeam.flag_emoji} size={22} />
          <span className="truncate text-sm font-bold text-ink">{homeTeam.name}</span>
        </div>
        <span className="font-marcador text-[10px] font-semibold text-ink-faint">VS</span>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
          <Flag emoji={awayTeam.flag_emoji} size={22} />
          <span className="truncate text-right text-sm font-bold text-ink">{awayTeam.name}</span>
        </div>
      </div>

      <div className="mt-2.5 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => onTileTap("home")}
          aria-label={`Marcador de ${homeTeam.name}`}
        >
          <FlapTile value={homeScore} focused={focusedSide === "home"} />
        </button>
        <button
          type="button"
          onClick={() => onTileTap("away")}
          aria-label={`Marcador de ${awayTeam.name}`}
        >
          <FlapTile value={awayScore} focused={focusedSide === "away"} />
        </button>
      </div>
    </div>
  );
}
