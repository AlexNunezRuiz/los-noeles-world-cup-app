"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BreakdownBar, BreakdownLegend, type BreakdownData } from "./breakdown-bar";

export interface RankingRow {
  position: number;
  movement: number;
  name: string;
  points: number;
  isYou: boolean;
  breakdown: BreakdownData;
  gapInfo?: string;
  userId: string;
}

function Movement({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "font-marcador text-[11px] font-bold",
        value > 0 ? "text-green" : value < 0 ? "text-red" : "text-ink-faint"
      )}
    >
      {value > 0 ? `▲${value}` : value < 0 ? `▼${-value}` : "="}
    </span>
  );
}

const EDGE: Record<number, string> = {
  1: "shadow-[inset_4px_0_0_var(--gold)]",
  2: "shadow-[inset_4px_0_0_#9b958a]",
  3: "shadow-[inset_4px_0_0_#b07d3e]",
};

function RankingRowItem({ player }: { player: RankingRow }) {
  const [open, setOpen] = useState(false);
  const initial = player.name.slice(0, 2);

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface",
        player.isYou
          ? "border-2 border-red shadow-[0_6px_16px_-10px_rgba(221,53,43,0.5)]"
          : cn("border-border", EDGE[player.position])
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span
          className={cn(
            "w-5 text-center font-marcador font-bold",
            player.isYou ? "text-xl text-red" : "text-base text-ink-faint"
          )}
        >
          {player.position}
        </span>
        <Movement value={player.movement} />
        <Link
          href={`/jugador/${player.userId}`}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-full font-marcador font-bold",
              player.isYou
                ? "h-7 w-7 bg-red text-xs text-white"
                : "h-6 w-6 bg-surface-sunken text-[10px] text-ink-muted"
            )}
          >
            {initial}
          </span>
          <span className="truncate font-sans text-sm font-bold text-ink">
            {player.name}
            {player.isYou && (
              <span className="ml-1.5 rounded bg-ink px-1.5 py-0.5 font-marcador text-[8px] font-bold text-cream">
                TÚ
              </span>
            )}
          </span>
        </Link>
        <span
          className={cn(
            "font-marcador font-bold text-ink",
            player.isYou ? "text-2xl" : "text-lg"
          )}
        >
          {player.points}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Ocultar desglose" : "Ver desglose de puntos"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:bg-surface-sunken hover:text-ink focus:outline-none focus:ring-2 focus:ring-blue/25"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <div className="border-t border-dashed border-border px-3 pb-3 pt-2.5">
          {player.gapInfo && (
            <p className="mb-2 text-[10px] font-semibold text-ink-muted">{player.gapInfo}</p>
          )}
          <BreakdownBar data={player.breakdown} />
          <div className="mt-2.5">
            <BreakdownLegend data={player.breakdown} />
          </div>
          <Link
            href={`/jugador/${player.userId}`}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue hover:underline"
          >
            Ver perfil y detalle →
          </Link>
        </div>
      )}
    </div>
  );
}

export function RankingList({ players }: { players: RankingRow[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {players.map((p) => (
        <RankingRowItem key={p.userId} player={p} />
      ))}
    </div>
  );
}
