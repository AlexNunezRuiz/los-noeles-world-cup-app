"use client";

import { cn } from "@/lib/utils";
import { BreakdownBar } from "./breakdown-bar";

interface Breakdown {
  grupos: number;
  cuadro: number;
  clasif: number;
  premios: number;
}

export interface RankingRow {
  position: number;
  movement: number;
  name: string;
  points: number;
  isYou: boolean;
  breakdown: Breakdown;
  gapInfo?: string;
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

export function RankingList({ players }: { players: RankingRow[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {players.map((p) => {
        const initial = p.name.slice(0, 2);
        if (p.isYou) {
          return (
            <div
              key={p.position}
              className="rounded-xl border-2 border-red bg-surface p-3 shadow-[0_6px_16px_-10px_rgba(221,53,43,0.5)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-5 text-center font-marcador text-xl font-bold text-red">{p.position}</span>
                <Movement value={p.movement} />
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red font-marcador text-xs font-bold text-white">
                  {initial}
                </span>
                <span className="flex-1 font-sans text-sm font-extrabold text-ink">
                  {p.name}
                  <span className="ml-1.5 rounded bg-ink px-1.5 py-0.5 font-marcador text-[8px] font-bold text-cream">
                    TÚ
                  </span>
                </span>
                <span className="font-marcador text-2xl font-bold text-ink">{p.points}</span>
              </div>
              <div className="mt-2.5 border-t border-dashed border-border pt-2.5">
                {p.gapInfo && <p className="mb-1.5 text-[10px] font-semibold text-ink-muted">{p.gapInfo}</p>}
                <BreakdownBar {...p.breakdown} />
              </div>
            </div>
          );
        }
        return (
          <div
            key={p.position}
            className={cn(
              "grid grid-cols-[20px_28px_1fr_auto] items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5",
              EDGE[p.position]
            )}
          >
            <span className="text-center font-marcador text-base font-bold text-ink-faint">{p.position}</span>
            <Movement value={p.movement} />
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-sunken font-marcador text-[10px] font-bold text-ink-muted">
                {initial}
              </span>
              <span className="truncate font-sans text-xs font-bold text-ink">{p.name}</span>
            </span>
            <span className="font-marcador text-lg font-bold text-ink">{p.points}</span>
          </div>
        );
      })}
    </div>
  );
}
