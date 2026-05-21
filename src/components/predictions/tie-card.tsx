"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/ui/flag";
import { FlapTile } from "@/components/ui/flap-tile";

interface Contender {
  sourceLabel: string;
  team: { name: string; flag_emoji: string } | null;
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
  onTileTap: (side: "home" | "away") => void;
}

function ContenderRow({
  c,
  score,
  side,
  focused,
  onTap,
}: {
  c: Contender;
  score: number | null;
  side: "home" | "away";
  focused: boolean;
  onTap: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 font-marcador text-[10px] font-bold uppercase text-ink-faint">
        {c.sourceLabel}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {c.team ? (
          <>
            <Flag emoji={c.team.flag_emoji} size={18} />
            <span className="truncate text-xs font-bold text-ink">{c.team.name}</span>
          </>
        ) : (
          <span className="text-xs font-semibold text-ink-faint">Por decidir</span>
        )}
      </div>
      <button type="button" onClick={onTap} aria-label={`Marcador ${side}`}>
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
  onTileTap,
}: TieCardProps) {
  const resolved = home.team !== null && away.team !== null;
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
        Cruce Nº {String(matchNumber).padStart(2, "0")} · {roundLabel}
      </p>
      <div className="space-y-2">
        <ContenderRow
          c={home}
          score={homeScore}
          side="home"
          focused={focusedSide === "home"}
          onTap={() => onTileTap("home")}
        />
        <ContenderRow
          c={away}
          score={awayScore}
          side="away"
          focused={focusedSide === "away"}
          onTap={() => onTileTap("away")}
        />
      </div>
      {selected && (
        <div className="mt-3 border-t border-dashed border-border pt-2.5">
          <p className="text-[11px] text-ink-muted">
            Sale de <b className="text-ink">{home.sourceLabel}</b> y{" "}
            <b className="text-ink">{away.sourceLabel}</b>.
          </p>
          <Link
            href="/predicciones/grupos"
            className="mt-1.5 inline-block font-marcador text-[11px] font-bold uppercase text-blue"
          >
            Ir a los grupos ›
          </Link>
        </div>
      )}
    </div>
  );
}
