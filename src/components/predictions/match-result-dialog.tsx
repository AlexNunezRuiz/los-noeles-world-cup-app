"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/ui/flag";
import { FlapTile } from "@/components/ui/flap-tile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  name: string;
  flag_emoji: string;
}

interface MatchResultDialogProps {
  open: boolean;
  onClose: () => void;
  matchNumber: number;
  roundLabel: string;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeSourceLabel: string;
  awaySourceLabel: string;
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinner: "home" | "away" | null | undefined;
  isLocked: boolean;
  onSave: (
    matchNumber: number,
    home: number,
    away: number,
    penaltyWinner?: "home" | "away"
  ) => Promise<void>;
}

// ─── Digits grid (5 × 2) — same style as ScorePad ────────────────────────────

function DigitGrid({ onDigit }: { onDigit: (n: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {Array.from({ length: 10 }, (_, n) => (
        <button
          key={n}
          type="button"
          onClick={() => onDigit(n)}
          className="h-9 rounded-md bg-surface-sunken font-marcador text-lg font-bold text-ink transition-colors active:bg-red active:text-white"
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── Dialog component ─────────────────────────────────────────────────────────

export function MatchResultDialog({
  open,
  onClose,
  matchNumber,
  roundLabel,
  homeTeam,
  awayTeam,
  homeSourceLabel,
  awaySourceLabel,
  homeScore,
  awayScore,
  penaltyWinner,
  isLocked,
  onSave,
}: MatchResultDialogProps) {
  // Local score state — mirrors props but editable
  const [localHome, setLocalHome] = useState<number | null>(homeScore);
  const [localAway, setLocalAway] = useState<number | null>(awayScore);
  const [localPenalty, setLocalPenalty] = useState<"home" | "away" | null | undefined>(penaltyWinner);
  const [focused, setFocused] = useState<"home" | "away">("home");
  const [saving, setSaving] = useState(false);

  // Sync from parent when dialog opens for a new match
  const resetToProps = useCallback(() => {
    setLocalHome(homeScore);
    setLocalAway(awayScore);
    setLocalPenalty(penaltyWinner);
    setFocused("home");
  }, [homeScore, awayScore, penaltyWinner]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      resetToProps();
    } else {
      onClose();
    }
  };

  const handleDigit = (n: number) => {
    if (isLocked) return;
    if (focused === "home") {
      setLocalHome(n);
      // Reset penalty if scores change
      setLocalPenalty(null);
      setFocused("away");
    } else {
      setLocalAway(n);
      setLocalPenalty(null);
    }
  };

  const isDraw =
    localHome !== null &&
    localAway !== null &&
    localHome === localAway;

  const handlePenalty = (side: "home" | "away") => {
    if (isLocked) return;
    setLocalPenalty(side);
  };

  const handleSave = async () => {
    if (localHome === null || localAway === null || isLocked) return;
    setSaving(true);
    await onSave(matchNumber, localHome, localAway, isDraw ? (localPenalty ?? undefined) : undefined);
    setSaving(false);
    onClose();
  };

  const homeDisplayName = homeTeam?.name ?? homeSourceLabel;
  const awayDisplayName = awayTeam?.name ?? awaySourceLabel;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-5">
        <DialogHeader>
          <DialogTitle className="text-base">
            P{String(matchNumber).padStart(2, "0")} · {roundLabel}
          </DialogTitle>
        </DialogHeader>

        {/* Teams + score tiles */}
        <div className="flex flex-col gap-3 mt-1">
          {/* Home */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {homeTeam ? (
                <Flag emoji={homeTeam.flag_emoji} size={20} />
              ) : (
                <span className="block w-5 h-5 rounded-full bg-border shrink-0" />
              )}
              <span className="truncate text-sm font-bold text-ink">
                {homeDisplayName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => !isLocked && setFocused("home")}
              aria-label="Goles local"
            >
              <FlapTile value={localHome} size="md" focused={!isLocked && focused === "home"} />
            </button>
          </div>

          {/* Away */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {awayTeam ? (
                <Flag emoji={awayTeam.flag_emoji} size={20} />
              ) : (
                <span className="block w-5 h-5 rounded-full bg-border shrink-0" />
              )}
              <span className="truncate text-sm font-bold text-ink">
                {awayDisplayName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => !isLocked && setFocused("away")}
              aria-label="Goles visitante"
            >
              <FlapTile value={localAway} size="md" focused={!isLocked && focused === "away"} />
            </button>
          </div>
        </div>

        {/* Digit grid */}
        {!isLocked && (
          <div className="mt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Goles de{" "}
              <span className="text-ink">
                {focused === "home" ? homeDisplayName : awayDisplayName}
              </span>
            </p>
            <DigitGrid onDigit={handleDigit} />
          </div>
        )}

        {/* Manual winner section (draw case) */}
        {isDraw && !isLocked && (
          <div className="mt-3 rounded-xl border border-border bg-surface-sunken p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
              Empate en 90 minutos: elige quién pasa
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePenalty("home")}
                disabled={!homeTeam || !awayTeam}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 font-marcador text-xs font-bold uppercase transition-colors",
                  localPenalty === "home"
                    ? "border-red bg-red text-white"
                    : "border-border bg-surface text-ink"
                )}
              >
                {homeTeam && <Flag emoji={homeTeam.flag_emoji} size={14} />}
                {homeDisplayName}
              </button>
              <button
                type="button"
                onClick={() => handlePenalty("away")}
                disabled={!homeTeam || !awayTeam}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 font-marcador text-xs font-bold uppercase transition-colors",
                  localPenalty === "away"
                    ? "border-red bg-red text-white"
                    : "border-border bg-surface text-ink"
                )}
              >
                {awayTeam && <Flag emoji={awayTeam.flag_emoji} size={14} />}
                {awayDisplayName}
              </button>
            </div>
          </div>
        )}

        {/* Save / Listo button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={
            localHome === null ||
            localAway === null ||
            (isDraw && !localPenalty) ||
            (isDraw && (!homeTeam || !awayTeam)) ||
            saving ||
            isLocked
          }
          className={cn(
            "mt-4 w-full rounded-xl py-3 font-marcador text-sm font-bold uppercase tracking-wider transition-colors",
            localHome !== null && localAway !== null && (!isDraw || (localPenalty && homeTeam && awayTeam)) && !isLocked
              ? "bg-red text-white active:bg-red/80"
              : "bg-surface-sunken text-ink-muted cursor-not-allowed"
          )}
        >
          {saving ? "Guardando…" : isLocked ? "Bloqueado" : "Listo"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
