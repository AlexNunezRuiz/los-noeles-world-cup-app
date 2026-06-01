"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/ui/flag";
import { FlapTile } from "@/components/ui/flap-tile";

interface Contender {
  sourceLabel: string;
  team: { name: string; flag_emoji: string; code?: string } | null;
}

interface TieCardProps {
  matchNumber: number;
  roundLabel: string;
  home: Contender;
  away: Contender;
  homeScore: number | null;
  awayScore: number | null;
  selected?: boolean;
  focusedSide?: "home" | "away" | null;
  sourceGroups?: string[];
  penaltyWinner?: "home" | "away" | null;
  onTileTap: (side: "home" | "away") => void;
  onWinnerSelect?: (side: "home" | "away") => void;
}

function ContenderRow({
  c,
  score,
  side,
  focused,
  winner,
  onTap,
}: {
  c: Contender;
  score: number | null;
  side: "home" | "away";
  focused: boolean;
  winner: boolean;
  onTap: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onTap();
      }}
      className={cn(
        "flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors",
        winner ? "bg-green/10 ring-1 ring-green/25" : "hover:bg-surface-sunken"
      )}
    >
      <span className="w-14 shrink-0 font-marcador text-[10px] font-bold uppercase text-ink-faint">
        {c.sourceLabel}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {c.team ? (
          <>
            <Flag emoji={c.team.flag_emoji} size={18} />
            <span className={cn("truncate text-xs font-bold", winner ? "text-green" : "text-ink")}>
              {c.team.name}
            </span>
          </>
        ) : (
          <span className="text-xs font-semibold text-ink-faint">Por decidir</span>
        )}
      </div>
      {winner && (
        <span className="shrink-0 rounded bg-green px-1.5 py-0.5 font-marcador text-[9px] font-bold uppercase text-white">
          Pasa
        </span>
      )}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onTap();
        }}
        aria-label={`Marcador ${side}`}
      >
        <FlapTile value={score} size="sm" focused={focused} />
      </button>
    </div>
  );
}

export function TieCard({
  matchNumber,
  roundLabel,
  home,
  away,
  homeScore,
  awayScore,
  selected,
  focusedSide,
  sourceGroups = [],
  penaltyWinner,
  onTileTap,
  onWinnerSelect,
}: TieCardProps) {
  const resolved = home.team !== null && away.team !== null;
  const isDraw = homeScore !== null && awayScore !== null && homeScore === awayScore;
  const homeWins =
    homeScore !== null &&
    awayScore !== null &&
    (homeScore > awayScore || (isDraw && penaltyWinner === "home"));
  const awayWins =
    homeScore !== null &&
    awayScore !== null &&
    (awayScore > homeScore || (isDraw && penaltyWinner === "away"));
  const uniqueSourceGroups = Array.from(new Set(sourceGroups)).filter(Boolean);

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-3",
        selected
          ? "border-red ring-[3px] ring-red/10"
          : resolved
          ? "border-border"
          : "border-dashed border-border"
      )}
    >
      <p className="mb-2 font-marcador text-[10px] font-bold uppercase tracking-wider text-ink-faint">
        Cruce No {String(matchNumber).padStart(2, "0")} · {roundLabel}
      </p>
      <div className="space-y-2">
        <ContenderRow
          c={home}
          score={homeScore}
          side="home"
          focused={focusedSide === "home"}
          winner={homeWins}
          onTap={() => onTileTap("home")}
        />
        <ContenderRow
          c={away}
          score={awayScore}
          side="away"
          focused={focusedSide === "away"}
          winner={awayWins}
          onTap={() => onTileTap("away")}
        />
      </div>

      {selected && isDraw && resolved && onWinnerSelect && (
        <div className="mt-3 rounded-lg border border-amber/40 bg-amber/[0.08] p-2.5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            Empate en 90 minutos: elige quien pasa
          </p>
          <div className="flex gap-2">
            {(["home", "away"] as const).map((side) => {
              const contender = side === "home" ? home : away;
              return (
                <button
                  key={side}
                  type="button"
                  onClick={() => onWinnerSelect(side)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 font-marcador text-xs font-bold uppercase transition-colors",
                    penaltyWinner === side
                      ? "border-red bg-red text-white"
                      : "border-border bg-surface text-ink"
                  )}
                >
                  {contender.team && <Flag emoji={contender.team.flag_emoji} size={14} />}
                  {contender.team?.code ?? contender.team?.name ?? contender.sourceLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <div className="mt-3 border-t border-dashed border-border pt-2.5">
          <p className="text-[11px] text-ink-muted">
            Sale de <b className="text-ink">{home.sourceLabel}</b> y{" "}
            <b className="text-ink">{away.sourceLabel}</b>.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {uniqueSourceGroups.length > 0 ? (
              uniqueSourceGroups.map((group) => (
                <Link
                  key={group}
                  href={`/predicciones/grupos?grupo=${group}`}
                  className="font-marcador text-[11px] font-bold uppercase text-blue"
                >
                  Grupo {group} ›
                </Link>
              ))
            ) : (
              <Link
                href="/predicciones/grupos"
                className="font-marcador text-[11px] font-bold uppercase text-blue"
              >
                Ir a los grupos ›
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
