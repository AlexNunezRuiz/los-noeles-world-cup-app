"use client";

import { cn } from "@/lib/utils";
import { Flag } from "@/components/ui/flag";

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
  onSelectMatch: (matchNumber: number) => void;
}

// ─── Round definitions ────────────────────────────────────────────────────────

const ROUND_COLUMNS = [
  { key: "round_of_32",   label: "16avos",  stages: ["round_of_32"] },
  { key: "round_of_16",   label: "Octavos", stages: ["round_of_16"] },
  { key: "quarter_final", label: "Cuartos", stages: ["quarter_final"] },
  { key: "semi_final",    label: "Semis",   stages: ["semi_final"] },
  { key: "final",         label: "Final",   stages: ["third_place", "final"] },
] as const;

// ─── Match node ───────────────────────────────────────────────────────────────

interface MatchNodeProps {
  match: BracketMatchView;
  prediction: BracketPrediction | undefined;
  onClick: () => void;
}

function MatchNode({ match, prediction, onClick }: MatchNodeProps) {
  const homeScore = prediction?.home_score ?? null;
  const awayScore = prediction?.away_score ?? null;

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
        "w-[148px] rounded-lg border border-border bg-surface text-left transition-colors",
        "hover:border-red/50 active:border-red"
      )}
    >
      {/* Home row */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 border-b border-border/50",
          homeWins && "bg-red/5"
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
            homeWins ? "text-ink" : "text-ink-muted"
          )}
        >
          {match.homeTeam ? match.homeTeam.name : match.homeSourceLabel}
        </span>
        <span
          className={cn(
            "shrink-0 text-[11px] font-marcador font-bold w-4 text-center",
            homeWins ? "text-red" : "text-ink-faint"
          )}
        >
          {homeScore !== null ? homeScore : "·"}
        </span>
      </div>

      {/* Away row */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5",
          awayWins && "bg-red/5"
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
            awayWins ? "text-ink" : "text-ink-muted"
          )}
        >
          {match.awayTeam ? match.awayTeam.name : match.awaySourceLabel}
        </span>
        <span
          className={cn(
            "shrink-0 text-[11px] font-marcador font-bold w-4 text-center",
            awayWins ? "text-red" : "text-ink-faint"
          )}
        >
          {awayScore !== null ? awayScore : "·"}
        </span>
      </div>
    </button>
  );
}

// ─── Connector lines between match pairs ────────────────────────────────────

/**
 * Renders a pair of matches in the left column connected by elbow lines to a
 * slot for the right-column match they feed into. The vertical space between
 * the two nodes is bridged by right-side borders so it looks like a classic
 * tournament bracket.
 */
function MatchPairWithConnector({
  top,
  bottom,
  predictions,
  onSelectMatch,
}: {
  top: BracketMatchView;
  bottom: BracketMatchView;
  predictions: Map<number, BracketPrediction>;
  onSelectMatch: (n: number) => void;
}) {
  return (
    // Each pair occupies the same height as one slot in the next column.
    // We stack the two nodes with connector pseudo-borders between them.
    <div className="flex items-center">
      {/* Two stacked nodes */}
      <div className="flex flex-col">
        {/* Top node + right border going down to midpoint */}
        <div className="flex items-center">
          <MatchNode
            match={top}
            prediction={predictions.get(top.match_number)}
            onClick={() => onSelectMatch(top.match_number)}
          />
          {/* Right elbow from top node: border-right + border-bottom half */}
          <div className="w-3 self-stretch border-r-2 border-b-2 border-border rounded-br-sm" style={{ marginBottom: "-1px" }} />
        </div>
        {/* Gap */}
        <div className="flex items-center">
          <MatchNode
            match={bottom}
            prediction={predictions.get(bottom.match_number)}
            onClick={() => onSelectMatch(bottom.match_number)}
          />
          {/* Right elbow from bottom node: border-right + border-top half */}
          <div className="w-3 self-stretch border-r-2 border-t-2 border-border rounded-tr-sm" style={{ marginTop: "-1px" }} />
        </div>
      </div>
      {/* Horizontal line to next column */}
      <div className="w-3 border-t-2 border-border self-center" />
    </div>
  );
}

// ─── Classic Bracket ──────────────────────────────────────────────────────────

export function ClassicBracket({
  matches,
  predictions,
  onSelectMatch,
}: ClassicBracketProps) {
  // Partition matches by stage
  const byStage = (stages: readonly string[]) =>
    matches
      .filter((m) => (stages as readonly string[]).includes(m.stage))
      .sort((a, b) => a.match_number - b.match_number);

  const r32 = byStage(ROUND_COLUMNS[0].stages);   // 16 matches
  const r16 = byStage(ROUND_COLUMNS[1].stages);   // 8 matches
  const qf  = byStage(ROUND_COLUMNS[2].stages);   // 4 matches
  const sf  = byStage(ROUND_COLUMNS[3].stages);   // 2 matches
  const fin = byStage(ROUND_COLUMNS[4].stages);   // 2 (3rd place + final)

  // NODE_H = height of one match node in px (~54px = 2 rows × ~27px)
  // GAP_R32: gap between the two nodes in a round_of_32 pair
  // We use tailwind gap classes

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex gap-0 min-w-max px-4 pt-2">

        {/* ── round_of_32 ─────────────────────────────────────────────────── */}
        <Column label="16avos">
          {/* 16 matches → 8 pairs, each pair feeds 1 r16 match */}
          <div className="flex flex-col gap-3">
            {Array.from({ length: Math.ceil(r32.length / 2) }, (_, i) => {
              const top = r32[i * 2];
              const bot = r32[i * 2 + 1];
              if (!top) return null;
              if (!bot) {
                return (
                  <div key={top.match_number} className="flex items-center">
                    <MatchNode
                      match={top}
                      prediction={predictions.get(top.match_number)}
                      onClick={() => onSelectMatch(top.match_number)}
                    />
                    <div className="w-6 border-t-2 border-border" />
                  </div>
                );
              }
              return (
                <MatchPairWithConnector
                  key={`${top.match_number}-${bot.match_number}`}
                  top={top}
                  bottom={bot}
                  predictions={predictions}
                  onSelectMatch={onSelectMatch}
                />
              );
            })}
          </div>
        </Column>

        {/* ── round_of_16 ─────────────────────────────────────────────────── */}
        <Column label="Octavos">
          <AlignedNodes
            matches={r16}
            predictions={predictions}
            onSelectMatch={onSelectMatch}
            nextCount={qf.length}
          />
        </Column>

        {/* ── quarter_final ────────────────────────────────────────────────── */}
        <Column label="Cuartos">
          <AlignedNodes
            matches={qf}
            predictions={predictions}
            onSelectMatch={onSelectMatch}
            nextCount={sf.length}
          />
        </Column>

        {/* ── semi_final ───────────────────────────────────────────────────── */}
        <Column label="Semis">
          <AlignedNodes
            matches={sf}
            predictions={predictions}
            onSelectMatch={onSelectMatch}
            nextCount={fin.length}
          />
        </Column>

        {/* ── Final + 3er puesto ───────────────────────────────────────────── */}
        <Column label="Final">
          <div className="flex flex-col gap-3">
            {fin.map((m) => (
              <div key={m.match_number} className="flex items-center">
                <MatchNode
                  match={m}
                  prediction={predictions.get(m.match_number)}
                  onClick={() => onSelectMatch(m.match_number)}
                />
              </div>
            ))}
          </div>
        </Column>
      </div>
    </div>
  );
}

// ─── Column wrapper ───────────────────────────────────────────────────────────

function Column({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <p className="mb-2 font-marcador text-[10px] uppercase tracking-widest text-ink-muted text-center w-[180px]">
        {label}
      </p>
      <div className="flex flex-col items-start">{children}</div>
    </div>
  );
}

// ─── AlignedNodes ─────────────────────────────────────────────────────────────

/**
 * Renders matches for a middle column. Each node is centered vertically in
 * the space occupied by the pair of nodes from the previous column that feed
 * into it, and connects forward to the next column with connectors.
 *
 * pairCount = number of node-pairs in the previous column
 * nextCount = number of matches in the next column (to know whether to draw connectors)
 */
function AlignedNodes({
  matches,
  predictions,
  onSelectMatch,
  nextCount,
}: {
  matches: BracketMatchView[];
  predictions: Map<number, BracketPrediction>;
  onSelectMatch: (n: number) => void;
  nextCount: number;
}) {
  // Each "slot" in this column must have the same height as one pair from the
  // previous column. We use flex with equal-height slots by relying on the
  // fact that each pair in the previous column has the same flex gap.
  // We replicate the gap structure: gap-3 between pairs, and the pair itself
  // takes ~2 node heights.

  // The simplest approach: place each node in a flex container that matches
  // the height of two nodes + the gap between them from the previous column.
  //
  // Node height ≈ 54px (2 rows at ~27px each).
  // gap-3 = 12px between pairs.
  // So slot = 54*2 + 12 = 120px per pair slot.
  // But since the pairs also have internal gap between top and bottom nodes,
  // we use a CSS approach: alternate between pairs of this column too.

  const willConnectNext = nextCount > 0 && matches.length > 1;

  if (matches.length === 0) return null;

  // For the final column pairs where there is no next connecting step
  const pairs = Array.from({ length: Math.ceil(matches.length / 2) }, (_, i) => ({
    top: matches[i * 2],
    bot: matches[i * 2 + 1] ?? null,
  }));

  if (willConnectNext) {
    return (
      <div className="flex flex-col gap-3">
        {pairs.map(({ top, bot }, i) => {
          if (!top) return null;
          if (!bot) {
            return (
              <div key={top.match_number} className="flex items-center self-center" style={{ marginTop: i === 0 ? "33px" : 0 }}>
                <MatchNode
                  match={top}
                  prediction={predictions.get(top.match_number)}
                  onClick={() => onSelectMatch(top.match_number)}
                />
                <div className="w-6 border-t-2 border-border" />
              </div>
            );
          }
          return (
            <MatchPairWithConnector
              key={`${top.match_number}-${bot.match_number}`}
              top={top}
              bottom={bot}
              predictions={predictions}
              onSelectMatch={onSelectMatch}
            />
          );
        })}
      </div>
    );
  }

  // No forward connectors — just show nodes stacked, centered in their slots
  return (
    <div className="flex flex-col gap-3">
      {matches.map((m, i) => (
        <div
          key={m.match_number}
          className="flex items-center"
          style={{ marginTop: i === 0 ? "33px" : 0 }}
        >
          <MatchNode
            match={m}
            prediction={predictions.get(m.match_number)}
            onClick={() => onSelectMatch(m.match_number)}
          />
        </div>
      ))}
    </div>
  );
}
