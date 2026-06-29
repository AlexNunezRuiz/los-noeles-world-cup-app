"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/ui/flag";
import type { PairingComparison } from "@/lib/results/knockout-comparison";

// Maps a real-vs-prediction comparison to a tiny dot colour. `null` → no badge.
function comparisonDotClass(comparison: PairingComparison | undefined): string | null {
  if (!comparison) return null;
  if (comparison.kind === "exact") return "bg-green";
  if (comparison.kind === "pairing") return "bg-amber-500";
  // kind === "teams": only show when at least one real team was in this round.
  if (comparison.home.inRound || comparison.away.inRound) return "bg-blue";
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  name: string;
  flag_emoji: string;
}

export interface BracketMatchView {
  match_number: number;
  stage: string;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeSourceLabel: string;
  awaySourceLabel: string;
}

interface BracketPrediction {
  home_score: number | null;
  away_score: number | null;
  penalty_winner?: "home" | "away" | null;
}

interface ClassicBracketProps {
  matches: BracketMatchView[];
  predictions: Map<number, BracketPrediction>;
  comparisonByMatchNumber?: Map<number, PairingComparison>;
  onSelectMatch: (matchNumber: number) => void;
}

// ─── Match number ranges per half ─────────────────────────────────────────────
// Official 2026 FIFA World Cup bracket feed tree:
// LEFT half feeds Semi 101:  R32[74,77,73,75] + [83,84,81,82] → R16[89,90,93,94] → QF[97,98] → SF[101]
// RIGHT half feeds Semi 102: R32[76,78,79,80] + [86,88,85,87] → R16[91,92,95,96] → QF[99,100] → SF[102]

// LEFT half  (flows right → towards centre)
const LEFT_R32  = [74, 77, 73, 75, 83, 84, 81, 82];
const LEFT_R16  = [89, 90, 93, 94];
const LEFT_QF   = [97, 98];
const LEFT_SF   = [101];

// RIGHT half  (flows left ← towards centre, mirrored)
const RIGHT_R32 = [76, 78, 79, 80, 86, 88, 85, 87];
const RIGHT_R16 = [91, 92, 95, 96];
const RIGHT_QF  = [99, 100];
const RIGHT_SF  = [102];

// Centre
const FINAL_NUM       = 104;
const THIRD_PLACE_NUM = 103;

// ─── Match node ───────────────────────────────────────────────────────────────

interface MatchNodeProps {
  match: BracketMatchView;
  prediction: BracketPrediction | undefined;
  comparison?: PairingComparison;
  onClick: () => void;
  /** extra width for the final node */
  wide?: boolean;
}

function MatchNode({ match, prediction, comparison, onClick, wide }: MatchNodeProps) {
  const homeScore = prediction?.home_score ?? null;
  const awayScore = prediction?.away_score ?? null;
  const dotClass = comparisonDotClass(comparison);

  const homeWins =
    homeScore !== null &&
    awayScore !== null &&
    (homeScore > awayScore ||
      (homeScore === awayScore && prediction?.penalty_winner === "home"));
  const awayWins =
    homeScore !== null &&
    awayScore !== null &&
    (awayScore > homeScore ||
      (homeScore === awayScore && prediction?.penalty_winner === "away"));

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-lg border border-border bg-surface text-left transition-colors",
        "hover:border-red/50 active:border-red",
        wide ? "w-[164px]" : "w-[148px]"
      )}
    >
      {/* Real-result overlay badge (read-only): green=exacto, ámbar=cruce, azul=equipo en ronda */}
      {dotClass && (
        <span
          className={cn(
            "absolute -top-1 -right-1 z-10 h-2.5 w-2.5 rounded-full border border-surface",
            dotClass
          )}
        />
      )}

      {/* Home row */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 border-b border-border/50",
        homeWins && "bg-green/10"
        )}
      >
        <span className="shrink-0 w-4 h-4 flex items-center justify-center">
          {match.homeTeam ? (
            <Flag emoji={match.homeTeam.flag_emoji} size={14} />
          ) : (
            <span className="block w-2.5 h-2.5 rounded-full bg-border" />
          )}
        </span>
        <span
          className={cn(
            "flex-1 truncate text-[10px] font-bold min-w-0",
            homeWins ? "text-green" : "text-ink-muted"
          )}
        >
          {match.homeTeam ? match.homeTeam.name : match.homeSourceLabel}
        </span>
        <span
          className={cn(
            "shrink-0 text-[11px] font-marcador font-bold w-4 text-center",
            homeWins ? "text-green" : "text-ink-faint"
          )}
        >
          {homeScore !== null ? homeScore : "·"}
        </span>
      </div>

      {/* Away row */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5",
        awayWins && "bg-green/10"
        )}
      >
        <span className="shrink-0 w-4 h-4 flex items-center justify-center">
          {match.awayTeam ? (
            <Flag emoji={match.awayTeam.flag_emoji} size={14} />
          ) : (
            <span className="block w-2.5 h-2.5 rounded-full bg-border" />
          )}
        </span>
        <span
          className={cn(
            "flex-1 truncate text-[10px] font-bold min-w-0",
            awayWins ? "text-green" : "text-ink-muted"
          )}
        >
          {match.awayTeam ? match.awayTeam.name : match.awaySourceLabel}
        </span>
        <span
          className={cn(
            "shrink-0 text-[11px] font-marcador font-bold w-4 text-center",
            awayWins ? "text-green" : "text-ink-faint"
          )}
        >
          {awayScore !== null ? awayScore : "·"}
        </span>
      </div>
    </button>
  );
}

// ─── Left-side connector: pair feeds right ────────────────────────────────────
//
// Layout (left → right):
//
//   [top node]──┐
//               │  (right border)
//   [bot node]──┘
//               ──── (horizontal line to next column)

interface LeftPairConnectorProps {
  top: BracketMatchView;
  bottom: BracketMatchView;
  predictions: Map<number, BracketPrediction>;
  comparisonByMatchNumber?: Map<number, PairingComparison>;
  onSelectMatch: (n: number) => void;
}

function LeftPairConnector({
  top,
  bottom,
  predictions,
  comparisonByMatchNumber,
  onSelectMatch,
}: LeftPairConnectorProps) {
  return (
    <div className="flex items-center">
      {/* Two stacked nodes with right-side elbow */}
      <div className="flex flex-col">
        {/* Top node + right border going down to midpoint */}
        <div className="flex items-center">
          <MatchNode
            match={top}
            prediction={predictions.get(top.match_number)}
            comparison={comparisonByMatchNumber?.get(top.match_number)}
            onClick={() => onSelectMatch(top.match_number)}
          />
          {/* Right elbow: border-right + border-bottom */}
          <div
            className="w-3 self-stretch border-r-2 border-b-2 border-border rounded-br-sm"
            style={{ marginBottom: "-1px" }}
          />
        </div>
        {/* Bottom node + right border going up to midpoint */}
        <div className="flex items-center">
          <MatchNode
            match={bottom}
            prediction={predictions.get(bottom.match_number)}
            comparison={comparisonByMatchNumber?.get(bottom.match_number)}
            onClick={() => onSelectMatch(bottom.match_number)}
          />
          {/* Right elbow: border-right + border-top */}
          <div
            className="w-3 self-stretch border-r-2 border-t-2 border-border rounded-tr-sm"
            style={{ marginTop: "-1px" }}
          />
        </div>
      </div>
      {/* Horizontal stub into next column */}
      <div className="w-3 border-t-2 border-border self-center" />
    </div>
  );
}

// ─── Right-side connector: pair feeds left (mirrored) ─────────────────────────
//
// Layout (right ← left):
//
//   ┌──[top node]
//   │  (left border)
//   └──[bot node]
//   ──── (horizontal line to next column, going left)

interface RightPairConnectorProps {
  top: BracketMatchView;
  bottom: BracketMatchView;
  predictions: Map<number, BracketPrediction>;
  comparisonByMatchNumber?: Map<number, PairingComparison>;
  onSelectMatch: (n: number) => void;
}

function RightPairConnector({
  top,
  bottom,
  predictions,
  comparisonByMatchNumber,
  onSelectMatch,
}: RightPairConnectorProps) {
  return (
    <div className="flex items-center flex-row-reverse">
      {/* Two stacked nodes with left-side elbow */}
      <div className="flex flex-col">
        {/* Top node + left border going down to midpoint */}
        <div className="flex items-center flex-row-reverse">
          <MatchNode
            match={top}
            prediction={predictions.get(top.match_number)}
            comparison={comparisonByMatchNumber?.get(top.match_number)}
            onClick={() => onSelectMatch(top.match_number)}
          />
          {/* Left elbow: border-left + border-bottom */}
          <div
            className="w-3 self-stretch border-l-2 border-b-2 border-border rounded-bl-sm"
            style={{ marginBottom: "-1px" }}
          />
        </div>
        {/* Bottom node + left border going up to midpoint */}
        <div className="flex items-center flex-row-reverse">
          <MatchNode
            match={bottom}
            prediction={predictions.get(bottom.match_number)}
            comparison={comparisonByMatchNumber?.get(bottom.match_number)}
            onClick={() => onSelectMatch(bottom.match_number)}
          />
          {/* Left elbow: border-left + border-top */}
          <div
            className="w-3 self-stretch border-l-2 border-t-2 border-border rounded-tl-sm"
            style={{ marginTop: "-1px" }}
          />
        </div>
      </div>
      {/* Horizontal stub into next column (visually to the left) */}
      <div className="w-3 border-t-2 border-border self-center" />
    </div>
  );
}

// ─── Left-side single node with right-pointing stub ──────────────────────────

function LeftSingleNode({
  match,
  predictions,
  comparisonByMatchNumber,
  onSelectMatch,
}: {
  match: BracketMatchView;
  predictions: Map<number, BracketPrediction>;
  comparisonByMatchNumber?: Map<number, PairingComparison>;
  onSelectMatch: (n: number) => void;
}) {
  return (
    <div className="flex items-center">
      <MatchNode
        match={match}
        prediction={predictions.get(match.match_number)}
        comparison={comparisonByMatchNumber?.get(match.match_number)}
        onClick={() => onSelectMatch(match.match_number)}
      />
      <div className="w-6 border-t-2 border-border" />
    </div>
  );
}

// ─── Right-side single node with left-pointing stub ───────────────────────────

function RightSingleNode({
  match,
  predictions,
  comparisonByMatchNumber,
  onSelectMatch,
}: {
  match: BracketMatchView;
  predictions: Map<number, BracketPrediction>;
  comparisonByMatchNumber?: Map<number, PairingComparison>;
  onSelectMatch: (n: number) => void;
}) {
  return (
    <div className="flex items-center flex-row-reverse">
      <MatchNode
        match={match}
        prediction={predictions.get(match.match_number)}
        comparison={comparisonByMatchNumber?.get(match.match_number)}
        onClick={() => onSelectMatch(match.match_number)}
      />
      <div className="w-6 border-t-2 border-border" />
    </div>
  );
}

// ─── Column wrapper ───────────────────────────────────────────────────────────

function Column({
  label,
  children,
  width = 180,
  topOffset = 0,
  rowGap = 12,
}: {
  label: string;
  children: React.ReactNode;
  width?: number;
  topOffset?: number;
  rowGap?: number;
}) {
  return (
    <div className="flex flex-col" style={{ width }}>
      <p className="mb-2 font-marcador text-[10px] uppercase tracking-widest text-ink-muted text-center">
        {label}
      </p>
      <div className="flex flex-col items-stretch" style={{ paddingTop: topOffset }}>
        <div className="flex flex-col" style={{ gap: rowGap }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Left half column ─────────────────────────────────────────────────────────
//
// Renders pairs (or singles for the semi) in a left-to-right flowing column.
// Each pair fans in to the next inner column.

function LeftColumn({
  label,
  matchNums,
  allMatches,
  predictions,
  comparisonByMatchNumber,
  onSelectMatch,
  width,
  topOffset = 0,
  rowGap = 12,
}: {
  label: string;
  matchNums: number[];
  allMatches: BracketMatchView[];
  predictions: Map<number, BracketPrediction>;
  comparisonByMatchNumber?: Map<number, PairingComparison>;
  onSelectMatch: (n: number) => void;
  width?: number;
  topOffset?: number;
  rowGap?: number;
}) {
  const matchMap = useMemo(
    () => new Map(allMatches.map((match) => [match.match_number, match])),
    [allMatches]
  );
  const ordered = matchNums
    .map((n) => matchMap.get(n))
    .filter((m): m is BracketMatchView => m !== undefined);

  // Build pairs (top, bottom). Odd match at end becomes a single.
  const rows: React.ReactNode[] = [];

  if (ordered.length === 1) {
    // Single node (e.g. semi-final left)
    rows.push(
      <LeftSingleNode
        key={ordered[0].match_number}
        match={ordered[0]}
        predictions={predictions}
        comparisonByMatchNumber={comparisonByMatchNumber}
        onSelectMatch={onSelectMatch}
      />
    );
  } else {
    for (let i = 0; i < ordered.length; i += 2) {
      const top = ordered[i];
      const bot = ordered[i + 1];
      if (top && bot) {
        rows.push(
          <LeftPairConnector
            key={`${top.match_number}-${bot.match_number}`}
            top={top}
            bottom={bot}
            predictions={predictions}
            comparisonByMatchNumber={comparisonByMatchNumber}
            onSelectMatch={onSelectMatch}
          />
        );
      } else if (top) {
        rows.push(
          <LeftSingleNode
            key={top.match_number}
            match={top}
            predictions={predictions}
            comparisonByMatchNumber={comparisonByMatchNumber}
            onSelectMatch={onSelectMatch}
          />
        );
      }
    }
  }

  return (
    <Column label={label} width={width} topOffset={topOffset} rowGap={rowGap}>
      {rows}
    </Column>
  );
}

// ─── Right half column ────────────────────────────────────────────────────────
//
// Mirrors LeftColumn: connectors point leftward.

function RightColumn({
  label,
  matchNums,
  allMatches,
  predictions,
  comparisonByMatchNumber,
  onSelectMatch,
  width,
  topOffset = 0,
  rowGap = 12,
}: {
  label: string;
  matchNums: number[];
  allMatches: BracketMatchView[];
  predictions: Map<number, BracketPrediction>;
  comparisonByMatchNumber?: Map<number, PairingComparison>;
  onSelectMatch: (n: number) => void;
  width?: number;
  topOffset?: number;
  rowGap?: number;
}) {
  const matchMap = useMemo(
    () => new Map(allMatches.map((match) => [match.match_number, match])),
    [allMatches]
  );
  const ordered = matchNums
    .map((n) => matchMap.get(n))
    .filter((m): m is BracketMatchView => m !== undefined);

  const rows: React.ReactNode[] = [];

  if (ordered.length === 1) {
    rows.push(
      <RightSingleNode
        key={ordered[0].match_number}
        match={ordered[0]}
        predictions={predictions}
        comparisonByMatchNumber={comparisonByMatchNumber}
        onSelectMatch={onSelectMatch}
      />
    );
  } else {
    for (let i = 0; i < ordered.length; i += 2) {
      const top = ordered[i];
      const bot = ordered[i + 1];
      if (top && bot) {
        rows.push(
          <RightPairConnector
            key={`${top.match_number}-${bot.match_number}`}
            top={top}
            bottom={bot}
            predictions={predictions}
            comparisonByMatchNumber={comparisonByMatchNumber}
            onSelectMatch={onSelectMatch}
          />
        );
      } else if (top) {
        rows.push(
          <RightSingleNode
            key={top.match_number}
            match={top}
            predictions={predictions}
            comparisonByMatchNumber={comparisonByMatchNumber}
            onSelectMatch={onSelectMatch}
          />
        );
      }
    }
  }

  return (
    <Column label={label} width={width} topOffset={topOffset} rowGap={rowGap}>
      {rows}
    </Column>
  );
}

// ─── Classic Bracket ──────────────────────────────────────────────────────────

export function ClassicBracket({
  matches,
  predictions,
  comparisonByMatchNumber,
  onSelectMatch,
}: ClassicBracketProps) {
  const matchMap = useMemo(
    () => new Map(matches.map((match) => [match.match_number, match])),
    [matches]
  );
  const find = (n: number) => matchMap.get(n);

  const finalMatch      = find(FINAL_NUM);
  const thirdPlaceMatch = find(THIRD_PLACE_NUM);

  // Column widths: outer columns are wider to hold the node + elbow stub.
  // Inner columns (semis → centre) can be tighter.
  const COL_R32  = 172; // node(148) + elbow(3) + stub(3) + gap
  const COL_MID  = 172; // same for octavos & cuartos
  const COL_SF   = 172; // semis
  const COL_FIN  = 196; // centre: node(164) + some padding
  const R16_OFFSET = 76;
  const QF_OFFSET = 186;
  const SF_OFFSET = 214;

  return (
    <div className="overflow-x-auto pb-4" data-swipe-ignore="true">
      <div className="inline-flex gap-0 min-w-max px-4 pt-2 items-start">

        {/* ── LEFT HALF ────────────────────────────────────────────────────── */}

        {/* 16avos L */}
        <LeftColumn
          label="16avos"
          matchNums={LEFT_R32}
          allMatches={matches}
          predictions={predictions}
          comparisonByMatchNumber={comparisonByMatchNumber}
          onSelectMatch={onSelectMatch}
          width={COL_R32}
          rowGap={12}
        />

        {/* Octavos L */}
        <LeftColumn
          label="Octavos"
          matchNums={LEFT_R16}
          allMatches={matches}
          predictions={predictions}
          comparisonByMatchNumber={comparisonByMatchNumber}
          onSelectMatch={onSelectMatch}
          width={COL_MID}
          topOffset={R16_OFFSET}
          rowGap={108}
        />

        {/* Cuartos L */}
        <LeftColumn
          label="Cuartos"
          matchNums={LEFT_QF}
          allMatches={matches}
          predictions={predictions}
          comparisonByMatchNumber={comparisonByMatchNumber}
          onSelectMatch={onSelectMatch}
          width={COL_MID}
          topOffset={QF_OFFSET}
        />

        {/* Semis L */}
        <LeftColumn
          label="Semis"
          matchNums={LEFT_SF}
          allMatches={matches}
          predictions={predictions}
          comparisonByMatchNumber={comparisonByMatchNumber}
          onSelectMatch={onSelectMatch}
          width={COL_SF}
          topOffset={SF_OFFSET}
        />

        {/* ── CENTRE ───────────────────────────────────────────────────────── */}

        <Column label="Final" width={COL_FIN} topOffset={SF_OFFSET - 26}>
          <div className="flex flex-col items-center gap-4">
            {/* Final — gold-accented */}
            {finalMatch ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-marcador uppercase tracking-widest text-gold">
                  Final
                </span>
                <div className="rounded-lg border-2 border-gold/60 shadow-sm shadow-gold/20">
                  <MatchNode
                    match={finalMatch}
                    prediction={predictions.get(FINAL_NUM)}
                    comparison={comparisonByMatchNumber?.get(FINAL_NUM)}
                    onClick={() => onSelectMatch(FINAL_NUM)}
                    wide
                  />
                </div>
              </div>
            ) : null}

            {/* 3er puesto */}
            {thirdPlaceMatch ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-marcador uppercase tracking-widest text-ink-faint">
                  3er Puesto
                </span>
                <MatchNode
                  match={thirdPlaceMatch}
                  prediction={predictions.get(THIRD_PLACE_NUM)}
                  comparison={comparisonByMatchNumber?.get(THIRD_PLACE_NUM)}
                  onClick={() => onSelectMatch(THIRD_PLACE_NUM)}
                />
              </div>
            ) : null}
          </div>
        </Column>

        {/* ── RIGHT HALF ───────────────────────────────────────────────────── */}

        {/* Semis R */}
        <RightColumn
          label="Semis"
          matchNums={RIGHT_SF}
          allMatches={matches}
          predictions={predictions}
          comparisonByMatchNumber={comparisonByMatchNumber}
          onSelectMatch={onSelectMatch}
          width={COL_SF}
          topOffset={SF_OFFSET}
        />

        {/* Cuartos R */}
        <RightColumn
          label="Cuartos"
          matchNums={RIGHT_QF}
          allMatches={matches}
          predictions={predictions}
          comparisonByMatchNumber={comparisonByMatchNumber}
          onSelectMatch={onSelectMatch}
          width={COL_MID}
          topOffset={QF_OFFSET}
        />

        {/* Octavos R */}
        <RightColumn
          label="Octavos"
          matchNums={RIGHT_R16}
          allMatches={matches}
          predictions={predictions}
          comparisonByMatchNumber={comparisonByMatchNumber}
          onSelectMatch={onSelectMatch}
          width={COL_MID}
          topOffset={R16_OFFSET}
          rowGap={108}
        />

        {/* 16avos R */}
        <RightColumn
          label="16avos"
          matchNums={RIGHT_R32}
          allMatches={matches}
          predictions={predictions}
          comparisonByMatchNumber={comparisonByMatchNumber}
          onSelectMatch={onSelectMatch}
          width={COL_R32}
          rowGap={12}
        />
      </div>
    </div>
  );
}
