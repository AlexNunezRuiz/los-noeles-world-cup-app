"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BoletinItem {
  tipo: "exacto" | "signo" | "fallo";
  puntos: number;
  matchId: number;
  matchNumber: number;
}

interface TuJornadaCardProps {
  jornada: number;
  puntos: number;
  posicion: number;
  movimiento: number;
  boletin: BoletinItem[];
}

const TILE: Record<BoletinItem["tipo"], { cls: string; label: string }> = {
  exacto: { cls: "bg-green/[0.13] text-green", label: "Exacto" },
  signo: { cls: "bg-green/[0.07] text-green border border-green/25", label: "Signo" },
  fallo: { cls: "bg-surface-sunken text-ink-faint", label: "Fallo" },
};

function formatMatchNumber(matchNumber: number) {
  return `P${String(matchNumber).padStart(2, "0")}`;
}

function formatPoints(points: number) {
  return points > 0 ? `+${points}` : "0";
}

function pointsLabel(points: number) {
  return `${formatPoints(points)} ${Math.abs(points) === 1 ? "punto" : "puntos"}`;
}

export function TuJornadaCard({ jornada, puntos, posicion, movimiento, boletin }: TuJornadaCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 shadow-[0_5px_14px_-11px_rgba(26,26,23,0.5)]">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="font-sans text-[9px] font-bold uppercase tracking-widest text-ink-faint">
            Tu jornada {jornada}
          </p>
          <p className="mt-0.5 font-marcador text-4xl font-bold leading-none text-green">
            +{puntos}
            <span className="ml-1 text-base text-ink-faint">pts</span>
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">
            {boletin.filter((b) => b.tipo !== "fallo").length} aciertos de {boletin.length} partidos
          </p>
        </div>
        <div className="rounded-xl border border-gold/40 bg-gold/[0.08] px-3 py-2 text-center">
          <p className="font-marcador text-2xl font-bold leading-none text-[#B07D3E]">{posicion}º</p>
          <p className="font-marcador text-[10px] font-bold text-green">
            {movimiento > 0 ? `▲${movimiento}` : movimiento < 0 ? `▼${-movimiento}` : "="}
          </p>
        </div>
      </div>
      {boletin.length > 0 && (
        <div className="mt-3 border-t border-dashed border-border pt-2.5">
          <p className="mb-1.5 font-sans text-[9px] font-bold uppercase tracking-widest text-ink-faint">
            Tu boletín
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {boletin.map((b, i) => (
              <Link
                key={`${b.matchId}-${i}`}
                href={`/resultados/predicciones?partido=${b.matchId}`}
                aria-label={`Ver partido ${formatMatchNumber(b.matchNumber)}: ${TILE[
                  b.tipo
                ].label.toLowerCase()}, ${pointsLabel(b.puntos)}`}
                title={`Ver ${formatMatchNumber(b.matchNumber)} - ${TILE[b.tipo].label}`}
                className={cn(
                  "w-[62px] shrink-0 rounded-md px-2 py-1.5 text-center transition-colors hover:ring-2 hover:ring-blue/20 focus:outline-none focus:ring-2 focus:ring-blue/30",
                  TILE[b.tipo].cls
                )}
              >
                <p className="font-marcador text-[10px] font-bold leading-none text-ink-muted">
                  {formatMatchNumber(b.matchNumber)}
                </p>
                <p className="mt-0.5 font-marcador text-base font-bold leading-none">
                  {formatPoints(b.puntos)}
                </p>
                <p className="mt-0.5 truncate text-[8px] font-bold uppercase">
                  {TILE[b.tipo].label}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
