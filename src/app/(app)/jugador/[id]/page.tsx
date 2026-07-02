"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BreakdownBar, BreakdownLegend } from "@/components/ranking/breakdown-bar";
import { Flag } from "@/components/ui/flag";
import { UserStatusIcon } from "@/components/users/user-status-icon";
import { isPredictionsLocked } from "@/lib/predictions/lock";
import { calculatePotentialSummary, type PredictedMilestone } from "@/lib/scoring/potential";
import { GroupChips } from "@/components/porra/group-chips";
import { GroupStandingsTable } from "@/components/predictions/GroupStandingsTable";
import { ClassicBracket, type BracketMatchView } from "@/components/predictions/classic-bracket";
import { calculateGroupStandings, getBestThirds, type TeamStanding } from "@/lib/tournament/standings";
import { populateKnockoutBracket, type BracketMatch, type KnockoutPrediction } from "@/lib/tournament/bracket";
import { aggregateBreakdown, ruleKeyToBreakdownType } from "@/lib/scoring/breakdown";
import { PointsAudit, type EliminatoriaRow, type PremioRow } from "@/components/profile/points-audit";
import { auditGroupMatches, auditGroupOrder, auditQualifiedByRound } from "@/lib/results/points-audit";

// ── DB row interfaces ─────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  display_name: string;
  has_paid: boolean;
  is_admin: boolean;
}

interface UserScoreRow {
  user_id: string;
  total_points: number;
  group_stage_points: number;
  knockout_exact_points: number;
  qualification_points: number;
  award_points: number;
}

interface TeamRow {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
  group_letter: string | null;
}

interface MatchRow {
  id: number;
  match_number: number;
  stage: string;
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  match_date: string | null;
  home_score: number | null;
  away_score: number | null;
  penalty_winner_team_id: number | null;
  is_finished: boolean;
}

interface MatchPredictionRow {
  id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  penalty_winner: "home" | "away" | null;
}

interface PredictedGroupStandingRow {
  id: string;
  group_letter: string;
  team_id: number;
  position: number;
  points: number;
  goal_difference: number;
  goals_for: number;
  goals_against: number;
}

interface AwardPredictionRow {
  id: string;
  award_type: "golden_boot" | "golden_ball" | "golden_glove";
  player_id: number | null;
  player_name: string | null;
}

interface PlayerRow {
  id: number;
  name: string;
  team_id: number | null;
}

interface ConfigRow {
  key: string;
  value: string;
}

interface ScoringRuleRow {
  rule_key: string;
  points: number;
}

interface ActualAwardRow {
  award_type: string;
  player_id: number | null;
  player_name: string | null;
}

interface BracketPositionRow {
  match_number: number;
  slot: "home" | "away";
  source_type: string;
  source_group?: string | null;
  source_match_number?: number | null;
  best_third_pool?: string | null;
}

interface BestThirdOrderRow {
  team_id: number;
  rank: number;
}

interface ScoreEventRow {
  rule_key: string;
  match_id: number | null;
  points: number;
  description: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AWARD_LABELS: Record<string, string> = {
  golden_boot: "Bota de Oro",
  golden_ball: "Balón de Oro",
  golden_glove: "Guante de Oro",
};

const STAGE_LABELS: Record<string, string> = {
  round_of_32: "Dieciseisavos",
  round_of_16: "Octavos de final",
  quarter_final: "Cuartos de final",
  semi_final: "Semifinales",
  third_place: "Tercer puesto",
  final: "Final",
};

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-marcador text-lg uppercase text-ink tracking-wide">
      {children}
    </h2>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-xs text-ink-muted italic py-2">{label}</p>
  );
}

function buildSourceLabel(bp: BracketPositionRow | undefined, placeholder: string | undefined | null) {
  if (bp?.source_type === "group_winner" && bp.source_group) return `1º Gr.${bp.source_group}`;
  if (bp?.source_type === "group_runner_up" && bp.source_group) return `2º Gr.${bp.source_group}`;
  if (bp?.source_type === "best_third" && bp.best_third_pool) return `3º (${bp.best_third_pool})`;
  if (bp?.source_type === "match_winner" && bp.source_match_number) return `W P${bp.source_match_number}`;
  if (bp?.source_type === "match_loser" && bp.source_match_number) return `L P${bp.source_match_number}`;
  return placeholder ?? "TBD";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JugadorPage() {
  const params = useParams<{ id: string }>() ?? { id: "" };
  const playerId = params.id;

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [scores, setScores] = useState<UserScoreRow | null>(null);
  const [matchPredictions, setMatchPredictions] = useState<MatchPredictionRow[]>([]);
  const [groupStandings, setGroupStandings] = useState<PredictedGroupStandingRow[]>([]);
  const [awardPredictions, setAwardPredictions] = useState<AwardPredictionRow[]>([]);
  const [teams, setTeams] = useState<Map<number, TeamRow>>(new Map());
  const [matches, setMatches] = useState<Map<number, MatchRow>>(new Map());
  const [players, setPlayers] = useState<Map<number, PlayerRow>>(new Map());
  const [bracketPositions, setBracketPositions] = useState<BracketPositionRow[]>([]);
  const [bestThirdOrder, setBestThirdOrder] = useState<Map<number, number>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isLocked, setIsLocked] = useState(false);
  const [scoringRules, setScoringRules] = useState<Map<string, number>>(new Map());
  const [actualAwards, setActualAwards] = useState<ActualAwardRow[]>([]);
  const [scoreEvents, setScoreEvents] = useState<ScoreEventRow[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("A");
  const [bracketView, setBracketView] = useState<"cuadro" | "rondas">("cuadro");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;

    async function load() {
      const supabase = createClient();

      const [
        {
          data: { user },
        },
        { data: profileData },
        { data: scoresData },
        { data: predictionsData },
        { data: standingsData },
        { data: awardsData },
        { data: teamsData },
        { data: matchesData },
        { data: playersData },
        { data: bracketPositionsData },
        { data: bestThirdOrderData },
        { data: configData },
        { data: rulesData },
        { data: actualAwardsData },
        { data: scoreEventsData },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("id, display_name, has_paid, is_admin").eq("id", playerId).single(),
        supabase.from("user_scores").select("user_id, total_points, group_stage_points, knockout_exact_points, qualification_points, award_points").eq("user_id", playerId).single(),
        supabase.from("match_predictions").select("id, match_id, home_score, away_score, penalty_winner").eq("user_id", playerId),
        supabase.from("predicted_group_standings").select("id, group_letter, team_id, position, points, goal_difference, goals_for, goals_against").eq("user_id", playerId).order("group_letter").order("position"),
        supabase.from("award_predictions").select("id, award_type, player_id, player_name").eq("user_id", playerId),
        supabase.from("teams").select("id, name, code, flag_emoji, group_letter"),
        supabase.from("matches").select("id, match_number, stage, group_letter, home_team_id, away_team_id, home_placeholder, away_placeholder, match_date, home_score, away_score, penalty_winner_team_id, is_finished").order("match_number"),
        supabase.from("players").select("id, name, team_id"),
        supabase.from("knockout_bracket_positions").select("match_number, slot, source_type, source_group, source_match_number, best_third_pool"),
        supabase.from("predicted_best_third_order").select("team_id, rank").eq("user_id", playerId).order("rank"),
        supabase.from("tournament_config").select("key, value"),
        supabase.from("scoring_rules").select("rule_key, points"),
        supabase.from("actual_awards").select("award_type, player_id, player_name"),
        supabase.from("score_events").select("rule_key, match_id, points, description").eq("user_id", playerId),
      ]);

      setCurrentUserId(user?.id ?? "");
      setProfile(profileData as ProfileRow | null);
      setScores(scoresData as UserScoreRow | null);
      setMatchPredictions((predictionsData ?? []) as MatchPredictionRow[]);
      setGroupStandings((standingsData ?? []) as PredictedGroupStandingRow[]);
      setAwardPredictions((awardsData ?? []) as AwardPredictionRow[]);
      setBracketPositions((bracketPositionsData ?? []) as BracketPositionRow[]);
      setBestThirdOrder(
        new Map(((bestThirdOrderData ?? []) as BestThirdOrderRow[]).map((row) => [row.team_id, row.rank]))
      );
      setIsLocked(isPredictionsLocked((configData ?? []) as ConfigRow[]));
      setScoringRules(
        new Map(
          ((rulesData ?? []) as ScoringRuleRow[]).map((rule) => [
            rule.rule_key,
            rule.points,
          ])
        )
      );
      setActualAwards((actualAwardsData ?? []) as ActualAwardRow[]);
      setScoreEvents((scoreEventsData ?? []) as ScoreEventRow[]);

      const teamMap = new Map<number, TeamRow>();
      for (const t of (teamsData ?? []) as TeamRow[]) teamMap.set(t.id, t);
      setTeams(teamMap);

      const matchMap = new Map<number, MatchRow>();
      for (const m of (matchesData ?? []) as MatchRow[]) matchMap.set(m.id, m);
      setMatches(matchMap);

      const playerMap = new Map<number, PlayerRow>();
      for (const p of (playersData ?? []) as PlayerRow[]) playerMap.set(p.id, p);
      setPlayers(playerMap);

      setLoading(false);
    }

    load();
  }, [playerId]);

  // ── Derived data ────────────────────────────────────────────────────────────

  // Split predictions into group and knockout
  const predictionsByMatchId = new Map<number, MatchPredictionRow>(
    matchPredictions.map((p) => [p.match_id, p])
  );
  const matchNumberById = new Map<number, number>(
    Array.from(matches.values()).map((match) => [match.id, match.match_number])
  );
  const predictionsByMatchNumber = new Map<number, KnockoutPrediction>();
  for (const pred of matchPredictions) {
    const matchNumber = matchNumberById.get(pred.match_id);
    if (!matchNumber) continue;
    predictionsByMatchNumber.set(matchNumber, {
      match_id: pred.match_id,
      match_number: matchNumber,
      home_score: pred.home_score,
      away_score: pred.away_score,
      penalty_winner: pred.penalty_winner ?? undefined,
    });
  }

  const groupStandingsForBracket = new Map<string, TeamStanding[]>();
  for (const group of GROUPS) {
    const rows = groupStandings
      .filter((standing) => standing.group_letter === group)
      .sort((a, b) => a.position - b.position)
      .map((standing) => ({
        team_id: standing.team_id,
        position: standing.position,
        points: standing.points,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: standing.goals_for,
        goals_against: standing.goals_against,
        goal_difference: standing.goal_difference,
      }));
    if (rows.length > 0) groupStandingsForBracket.set(group, rows);
  }
  const predictedBestThirds = getBestThirds(groupStandingsForBracket, bestThirdOrder);
  const baseKnockoutMatches: BracketMatch[] = Array.from(matches.values())
    .filter((match) => match.stage !== "group")
    .map((match) => ({
      match_number: match.match_number,
      stage: match.stage,
      home_team_id: match.home_team_id ?? undefined,
      away_team_id: match.away_team_id ?? undefined,
      home_placeholder: match.home_placeholder ?? undefined,
      away_placeholder: match.away_placeholder ?? undefined,
    }));
  const predictedBracketMatches = populateKnockoutBracket(
    groupStandingsForBracket,
    predictedBestThirds,
    baseKnockoutMatches,
    predictionsByMatchNumber,
    bracketPositions.map((bp) => ({
      match_number: bp.match_number,
      slot: bp.slot,
      source_type: bp.source_type,
      source_group: bp.source_group ?? undefined,
      source_match_number: bp.source_match_number ?? undefined,
      best_third_pool: bp.best_third_pool ?? undefined,
    }))
  );
  const predictedBracketByNumber = new Map(predictedBracketMatches.map((match) => [match.match_number, match]));

  const groupPredictions: Array<{ match: MatchRow; pred: MatchPredictionRow }> = [];
  const knockoutPredictions: Array<{ match: MatchRow; pred: MatchPredictionRow }> = [];

  for (const [matchId, pred] of predictionsByMatchId) {
    const match = matches.get(matchId);
    if (!match) continue;
    if (match.stage === "group") {
      groupPredictions.push({ match, pred });
    } else {
      const predictedMatch = predictedBracketByNumber.get(match.match_number);
      knockoutPredictions.push({
        match: predictedMatch
          ? {
              ...match,
              home_team_id: predictedMatch.home_team_id ?? null,
              away_team_id: predictedMatch.away_team_id ?? null,
              home_placeholder: predictedMatch.home_placeholder ?? match.home_placeholder,
              away_placeholder: predictedMatch.away_placeholder ?? match.away_placeholder,
            }
          : match,
        pred,
      });
    }
  }

  groupPredictions.sort((a, b) => a.match.match_number - b.match.match_number);
  knockoutPredictions.sort((a, b) => a.match.match_number - b.match.match_number);

  // Group standings grouped by group_letter
  const standingsByGroup = new Map<string, PredictedGroupStandingRow[]>();
  for (const s of groupStandings) {
    const arr = standingsByGroup.get(s.group_letter) ?? [];
    arr.push(s);
    standingsByGroup.set(s.group_letter, arr);
  }

  // ── Match row renderer ──────────────────────────────────────────────────────

  function renderMatchRow(match: MatchRow, pred: MatchPredictionRow) {
    const homeTeam = match.home_team_id != null ? teams.get(match.home_team_id) : null;
    const awayTeam = match.away_team_id != null ? teams.get(match.away_team_id) : null;
    const homeName = homeTeam?.name ?? match.home_placeholder ?? "?";
    const awayName = awayTeam?.name ?? match.away_placeholder ?? "?";
    const homeFlag = homeTeam?.flag_emoji ?? "";
    const awayFlag = awayTeam?.flag_emoji ?? "";

    return (
      <div
        key={pred.id}
        className="flex items-center gap-2 py-1.5 border-b border-border last:border-b-0"
      >
        {/* Home */}
        <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
          <span className="truncate font-sans text-xs text-ink text-right">{homeName}</span>
          {homeFlag && <Flag emoji={homeFlag} size={18} />}
        </div>
        {/* Score */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="font-marcador text-base font-bold text-ink w-4 text-center">{pred.home_score}</span>
          <span className="font-marcador text-xs text-ink-muted">–</span>
          <span className="font-marcador text-base font-bold text-ink w-4 text-center">{pred.away_score}</span>
        </div>
        {/* Away */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {awayFlag && <Flag emoji={awayFlag} size={18} />}
          <span className="truncate font-sans text-xs text-ink">{awayName}</span>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="font-marcador text-xl text-ink-muted animate-pulse">Cargando…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4 pt-1">
        <Link href="/ranking" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink transition-colors">
          ← Clasificación
        </Link>
        <p className="text-sm text-ink-muted">Jugador no encontrado.</p>
      </div>
    );
  }

  const totalPoints = scores?.total_points ?? 0;
  const breakdownData = aggregateBreakdown(scoreEvents);

  // Knockout predictions grouped by stage
  const knockoutByStage = new Map<string, Array<{ match: MatchRow; pred: MatchPredictionRow }>>();
  for (const item of knockoutPredictions) {
    const stage = item.match.stage;
    const arr = knockoutByStage.get(stage) ?? [];
    arr.push(item);
    knockoutByStage.set(stage, arr);
  }

  const stageOrder = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];
  const canSeePicks = isLocked || currentUserId === playerId;
  const allResultPredictions = [...groupPredictions, ...knockoutPredictions].sort(
    (a, b) => a.match.match_number - b.match.match_number
  );
  const completedGroups = GROUPS.filter((group) => (standingsByGroup.get(group)?.length ?? 0) >= 4);
  const selectedGroupPredictions = groupPredictions.filter(
    ({ match }) => match.group_letter === selectedGroup
  );
  const selectedGroupStandings = (groupStandingsForBracket.get(selectedGroup) ?? []).sort(
    (a, b) => a.position - b.position
  );
  const visibleResultPredictions = selectedGroupPredictions;
  const effectiveWindowStart = 0;
  const setWindowStart = (value: number) => {
    void value;
  };
  const bpMap = new Map(bracketPositions.map((bp) => [`${bp.match_number}:${bp.slot}`, bp]));
  const bracketMatchViews: BracketMatchView[] = predictedBracketMatches.map((match) => {
    const homeTeam = match.home_team_id ? teams.get(match.home_team_id) : undefined;
    const awayTeam = match.away_team_id ? teams.get(match.away_team_id) : undefined;
    return {
      match_number: match.match_number,
      stage: match.stage,
      homeTeam: homeTeam ? { name: homeTeam.name, flag_emoji: homeTeam.flag_emoji } : null,
      awayTeam: awayTeam ? { name: awayTeam.name, flag_emoji: awayTeam.flag_emoji } : null,
      homeSourceLabel: buildSourceLabel(bpMap.get(`${match.match_number}:home`), match.home_placeholder),
      awaySourceLabel: buildSourceLabel(bpMap.get(`${match.match_number}:away`), match.away_placeholder),
    };
  });

  const eliminatedTeamIds = new Set<number>();
  for (const match of Array.from(matches.values())) {
    if (
      match.stage !== "group" &&
      match.is_finished &&
      match.home_score !== null &&
      match.away_score !== null &&
      match.home_team_id !== null &&
      match.away_team_id !== null
    ) {
      if (match.home_score > match.away_score) eliminatedTeamIds.add(match.away_team_id);
      if (match.away_score > match.home_score) eliminatedTeamIds.add(match.home_team_id);
      if (match.home_score === match.away_score && match.penalty_winner_team_id !== null) {
        eliminatedTeamIds.add(
          match.penalty_winner_team_id === match.home_team_id
            ? match.away_team_id
            : match.home_team_id
        );
      }
    }
  }

  const predictedMilestones: PredictedMilestone[] = [];
  const qualificationRuleByStage: Record<string, string> = {
    round_of_32: "qualify_r32",
    round_of_16: "qualify_r16",
    quarter_final: "qualify_qf",
    semi_final: "qualify_sf",
    final: "qualify_finalist",
  };

  for (const item of knockoutPredictions) {
    const { match, pred } = item;
    if (match.home_team_id === null || match.away_team_id === null) continue;
    const qualificationRuleKey = qualificationRuleByStage[match.stage];
    if (qualificationRuleKey) {
      predictedMilestones.push({ teamId: match.home_team_id, ruleKey: qualificationRuleKey, round: match.stage });
      predictedMilestones.push({ teamId: match.away_team_id, ruleKey: qualificationRuleKey, round: match.stage });
    }
    if (match.stage === "final") {
      const championTeamId =
        pred.home_score === pred.away_score
          ? pred.penalty_winner === "away"
            ? match.away_team_id
            : match.home_team_id
          : pred.home_score > pred.away_score
            ? match.home_team_id
            : match.away_team_id;
      predictedMilestones.push({
        teamId: championTeamId,
        ruleKey: "qualify_champion",
        round: "champion",
      });
    }
    if (match.stage === "third_place") {
      const thirdPlaceTeamId =
        pred.home_score === pred.away_score
          ? pred.penalty_winner === "away"
            ? match.away_team_id
            : match.home_team_id
          : pred.home_score > pred.away_score
            ? match.home_team_id
            : match.away_team_id;
      predictedMilestones.push({
        teamId: thirdPlaceTeamId,
        ruleKey: "qualify_third",
        round: "third_place_winner",
      });
    }
  }

  for (const { match, pred } of allResultPredictions) {
    if (match.is_finished) continue;
    if (match.stage === "group") {
      predictedMilestones.push({ teamId: -match.id * 10 - 1, ruleKey: "correct_sign", round: "future_match" });
      predictedMilestones.push({ teamId: -match.id * 10 - 2, ruleKey: "exact_score", round: "future_match" });
    } else {
      const ruleKey =
        match.stage === "round_of_32"
          ? "exact_r32"
          : match.stage === "round_of_16"
            ? "exact_r16"
            : match.stage === "quarter_final"
              ? "exact_qf"
              : match.stage === "semi_final"
                ? "exact_sf"
                : match.stage === "third_place"
                  ? "exact_third"
                  : match.stage === "final"
                    ? "exact_final"
                    : "";
      if (ruleKey) {
        predictedMilestones.push({
          teamId: -match.id * 10 - pred.home_score - pred.away_score - 3,
          ruleKey,
          round: "future_match",
        });
      }
    }
  }

  const potentialSummary = calculatePotentialSummary({
    currentPoints: totalPoints,
    rules: scoringRules,
    predictedMilestones,
    conflicts: knockoutPredictions
      .map(({ match }) =>
        match.home_team_id !== null && match.away_team_id !== null
          ? [match.home_team_id, match.away_team_id]
          : null
      )
      .filter((conflict): conflict is number[] => conflict !== null),
    eliminatedTeamIds,
    awardPredictions: awardPredictions.map((award) => ({
      awardType: award.award_type,
      playerId: award.player_id,
      playerName: award.player_name,
    })),
    actualAwards: actualAwards.map((award) => ({
      awardType: award.award_type,
      playerId: award.player_id,
      playerName: award.player_name,
    })),
  });

  // ── Points audit (where the points come from) ───────────────────────────────
  const signPts = scoringRules.get("correct_sign") ?? 1;
  const exactPts = scoringRules.get("exact_score") ?? 1;
  const posPoints: Record<number, number> = {
    1: scoringRules.get("group_pos_1st") ?? 1,
    2: scoringRules.get("group_pos_2nd") ?? 1,
    3: scoringRules.get("group_pos_3rd") ?? 2,
    4: scoringRules.get("group_pos_4th") ?? 2,
  };

  const matchAudit = auditGroupMatches(
    Array.from(matches.values())
      .filter((m) => m.stage === "group")
      .map((m) => ({
        match_id: m.id,
        match_number: m.match_number,
        stage: m.stage,
        group_letter: m.group_letter,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_score: m.home_score,
        away_score: m.away_score,
        is_finished: m.is_finished,
      })),
    new Map(
      Array.from(predictionsByMatchId.entries()).map(([id, p]) => [
        id,
        { match_id: id, home_score: p.home_score, away_score: p.away_score },
      ])
    ),
    signPts,
    exactPts
  );

  const actualPositionsByGroup = new Map<string, Array<{ team_id: number; position: number }>>();
  for (const group of GROUPS) {
    const groupMatchRows = Array.from(matches.values()).filter(
      (m) => m.stage === "group" && m.group_letter === group
    );
    if (
      groupMatchRows.length === 0 ||
      !groupMatchRows.every(
        (m) =>
          m.is_finished &&
          m.home_team_id !== null &&
          m.away_team_id !== null &&
          m.home_score !== null &&
          m.away_score !== null
      )
    ) {
      continue;
    }
    const teamIds = Array.from(teams.values())
      .filter((t) => t.group_letter === group)
      .map((t) => t.id);
    const results = groupMatchRows.map((m) => ({
      home_team_id: m.home_team_id as number,
      away_team_id: m.away_team_id as number,
      home_score: m.home_score as number,
      away_score: m.away_score as number,
    }));
    const standings = calculateGroupStandings(teamIds, results);
    actualPositionsByGroup.set(
      group,
      standings.map((s) => ({ team_id: s.team_id, position: s.position }))
    );
  }
  const predictedPositionByGroup = new Map<string, Map<number, number>>();
  for (const [group, rows] of Array.from(standingsByGroup.entries())) {
    predictedPositionByGroup.set(group, new Map(rows.map((r) => [r.team_id, r.position])));
  }
  const orderAudit = auditGroupOrder(actualPositionsByGroup, predictedPositionByGroup, posPoints);

  // Selecciones que el usuario pronosticó para cada ronda (para pintar en gris
  // las que no llegaron). Los puntos (verdes) siguen saliendo de score_events.
  const stageToQualifyRule: Record<string, string> = {
    round_of_32: "qualify_r32",
    round_of_16: "qualify_r16",
    quarter_final: "qualify_qf",
    semi_final: "qualify_sf",
    final: "qualify_finalist",
  };
  const predictedByRule = new Map<string, number[]>();
  const addPredicted = (ruleKey: string, teamId: number | undefined | null) => {
    if (teamId == null) return;
    const arr = predictedByRule.get(ruleKey) ?? [];
    if (!arr.includes(teamId)) arr.push(teamId);
    predictedByRule.set(ruleKey, arr);
  };
  for (const m of predictedBracketMatches) {
    const stageRule = stageToQualifyRule[m.stage];
    if (stageRule) {
      addPredicted(stageRule, m.home_team_id);
      addPredicted(stageRule, m.away_team_id);
    }
    if (
      (m.stage === "final" || m.stage === "third_place") &&
      m.home_team_id != null &&
      m.away_team_id != null &&
      m.home_score != null &&
      m.away_score != null
    ) {
      const winner =
        m.home_score > m.away_score
          ? m.home_team_id
          : m.away_score > m.home_score
            ? m.away_team_id
            : m.penalty_winner === "home"
              ? m.home_team_id
              : m.penalty_winner === "away"
                ? m.away_team_id
                : undefined;
      if (winner != null) {
        const loser = winner === m.home_team_id ? m.away_team_id : m.home_team_id;
        if (m.stage === "final") {
          addPredicted("qualify_champion", winner);
          addPredicted("qualify_runner_up", loser);
        } else {
          addPredicted("qualify_third", winner);
          addPredicted("qualify_fourth", loser);
        }
      }
    }
  }

  // Selecciones realmente eliminadas del torneo (para tacharlas). Las que siguen
  // vivas pero cuya ronda aún no se ha decidido quedan neutras (ni verde ni gris).
  const realEliminatedTeamIds = new Set<number>();
  for (const m of Array.from(matches.values())) {
    if (m.stage === "group") continue;
    if (!m.is_finished || m.home_score == null || m.away_score == null) continue;
    if (m.home_team_id == null || m.away_team_id == null) continue;
    if (m.home_score > m.away_score) realEliminatedTeamIds.add(m.away_team_id);
    else if (m.away_score > m.home_score) realEliminatedTeamIds.add(m.home_team_id);
    else if (m.penalty_winner_team_id != null) {
      realEliminatedTeamIds.add(
        m.penalty_winner_team_id === m.home_team_id ? m.away_team_id : m.home_team_id
      );
    }
  }
  // Si la fase de grupos ya terminó, las que no están en los dieciseisavos reales
  // quedaron eliminadas en grupos.
  const groupMatchesAll = Array.from(matches.values()).filter((m) => m.stage === "group");
  const groupsFinished = groupMatchesAll.length > 0 && groupMatchesAll.every((m) => m.is_finished);
  if (groupsFinished) {
    const realR32Teams = new Set<number>();
    for (const m of Array.from(matches.values())) {
      if (m.stage !== "round_of_32") continue;
      if (m.home_team_id != null) realR32Teams.add(m.home_team_id);
      if (m.away_team_id != null) realR32Teams.add(m.away_team_id);
    }
    if (realR32Teams.size > 0) {
      for (const teamId of Array.from(teams.keys())) {
        if (!realR32Teams.has(teamId)) realEliminatedTeamIds.add(teamId);
      }
    }
  }

  const qualifiedByRound = auditQualifiedByRound(scoreEvents, predictedByRule, realEliminatedTeamIds);

  const eliminatoriasAudit: EliminatoriaRow[] = scoreEvents
    .filter((e) => ruleKeyToBreakdownType(e.rule_key) === "eliminatorias")
    .map((e, index) => ({
      key: `${e.rule_key}-${e.match_id ?? "x"}-${index}`,
      detail: e.description ?? e.rule_key,
      points: e.points,
    }));

  const actualAwardByType = new Map(actualAwards.map((a) => [a.award_type, a]));
  const premiosAudit: PremioRow[] = awardPredictions.map((award) => {
    const pick =
      award.player_name ??
      (award.player_id != null ? players.get(award.player_id)?.name : null) ??
      "—";
    const actual = actualAwardByType.get(award.award_type);
    let correct: boolean | null = null;
    if (actual && (actual.player_id != null || actual.player_name)) {
      correct =
        (award.player_id != null && award.player_id === actual.player_id) ||
        (!!award.player_name && award.player_name === actual.player_name);
    }
    const points = correct ? scoringRules.get(award.award_type) ?? 0 : 0;
    return { label: AWARD_LABELS[award.award_type] ?? award.award_type, pick, correct, points };
  });

  const auditTeams = new Map(
    Array.from(teams.values()).map((t) => [t.id, { name: t.name, flag_emoji: t.flag_emoji }])
  );

  return (
    <div className="space-y-5 pb-8 pt-1">
      {/* Back link */}
      <Link
        href="/ranking"
        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
      >
        ← Clasificación
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <h1 className="font-marcador text-3xl uppercase text-ink leading-tight">
              {profile.display_name}
            </h1>
            <UserStatusIcon is_admin={profile.is_admin} has_paid={profile.has_paid} showLabel />
          </div>
          <span className="font-marcador text-3xl font-bold text-ink leading-tight flex-shrink-0">
            {totalPoints}
            <span className="text-sm font-sans font-normal text-ink-muted ml-1">pts</span>
          </span>
        </div>
        <BreakdownBar data={breakdownData} />
        <BreakdownLegend data={breakdownData} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Puntos" value={totalPoints} suffix="pts" />
        <MetricCard label="Máximos puntos potenciales" value={potentialSummary.maximumPotentialPoints} suffix="pts" />
        <MetricCard label="Semifinalistas eliminados" value={potentialSummary.semifinalistsEliminated} />
        <MetricCard label="Finalistas eliminados" value={potentialSummary.finalistsEliminated} />
      </div>

      {!canSeePicks && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-ink">Predicciones bloqueadas</p>
          <p className="mt-1 text-xs text-ink-muted">
            Podrás ver los resultados de otros usuarios cuando empiece el Mundial y se cierre la edición.
          </p>
        </div>
      )}

      {/* Fase de grupos */}
      {canSeePicks && (
        <>
      <PointsAudit
        teams={auditTeams}
        matchAudit={matchAudit}
        orderAudit={orderAudit}
        qualifiedByRound={qualifiedByRound}
        eliminatorias={eliminatoriasAudit}
        premios={premiosAudit}
      />

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>Resultados</SectionTitle>
          <GroupChips current={selectedGroup} done={completedGroups} onSelect={setSelectedGroup} />
          <div className="hidden">
            <button
              type="button"
              disabled={effectiveWindowStart === 0}
              onClick={() => setWindowStart(Math.max(0, effectiveWindowStart - 5))}
              className="rounded-md border border-border bg-surface px-2 py-1 font-marcador text-xs uppercase text-ink disabled:opacity-40"
            >
              ‹ Atrás
            </button>
            <button
              type="button"
              disabled={effectiveWindowStart + 5 >= allResultPredictions.length}
              onClick={() => setWindowStart(effectiveWindowStart + 5)}
              className="rounded-md border border-border bg-surface px-2 py-1 font-marcador text-xs uppercase text-ink disabled:opacity-40"
            >
              Siguiente ›
            </button>
          </div>
        </div>
        {visibleResultPredictions.length === 0 ? (
          <EmptyState label="Sin pronósticos de fase de grupos" />
        ) : (
          <div className="rounded-xl border border-border bg-surface px-3">
            {visibleResultPredictions.map(({ match, pred }) => renderMatchRow(match, pred))}
          </div>
        )}
      </section>

      {/* Clasificados de grupo */}
      {selectedGroupStandings.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Clasificación Grupo {selectedGroup}</SectionTitle>
          <GroupStandingsTable
            standings={selectedGroupStandings}
            teams={teams}
            tiedTeamIds={[]}
            isLocked
          />
          <div className="hidden">
            {Array.from(standingsByGroup.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([letter, rows]) => (
              <div key={letter} className="rounded-xl border border-border bg-surface px-3 py-2">
                <p className="font-marcador text-xs uppercase text-ink-muted mb-1.5">Grupo {letter}</p>
                {rows.map((s) => {
                  const team = teams.get(s.team_id);
                  return (
                    <div key={s.id} className="flex items-center gap-2 py-1 border-b border-border last:border-b-0">
                      <span className="font-marcador text-sm font-bold text-ink-faint w-4 text-center">{s.position}</span>
                      {team?.flag_emoji && <Flag emoji={team.flag_emoji} size={18} />}
                      <span className="font-sans text-xs text-ink">{team?.name ?? "?"}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Eliminatorias */}
      <section className="space-y-2">
        <SectionTitle>Su cuadro final</SectionTitle>
        <div className="flex w-fit rounded-lg bg-surface-sunken p-1">
          {(["cuadro", "rondas"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setBracketView(mode)}
              className={`rounded-md px-2 py-1 font-marcador text-[10px] uppercase ${
                bracketView === mode ? "bg-surface text-ink shadow" : "text-ink-muted"
              }`}
            >
              {mode === "cuadro" ? "Cuadro" : "Rondas"}
            </button>
          ))}
        </div>
        {knockoutPredictions.length === 0 ? (
          <EmptyState label="Sin pronósticos de eliminatorias" />
        ) : bracketView === "cuadro" ? (
          <div className="-mx-4">
            <ClassicBracket
              matches={bracketMatchViews}
              predictions={predictionsByMatchNumber}
              onSelectMatch={() => undefined}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {stageOrder.map((stage) => {
              const items = knockoutByStage.get(stage);
              if (!items || items.length === 0) return null;
              return (
                <div key={stage}>
                  <p className="font-marcador text-xs uppercase text-ink-muted mb-1">{STAGE_LABELS[stage] ?? stage}</p>
                  <div className="rounded-xl border border-border bg-surface px-3">
                    {items.map(({ match, pred }) => renderMatchRow(match, pred))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Premios */}
      <section className="space-y-2">
        <SectionTitle>Premios</SectionTitle>
        {awardPredictions.length === 0 ? (
          <EmptyState label="Sin pronósticos de premios" />
        ) : (
          <div className="rounded-xl border border-border bg-surface px-3">
            {awardPredictions.map((award) => {
              const playerName =
                award.player_name ??
                (award.player_id != null ? players.get(award.player_id)?.name : null) ??
                "—";
              return (
                <div
                  key={award.id}
                  className="flex items-center justify-between gap-2 py-2.5 border-b border-border last:border-b-0"
                >
                  <span className="font-sans text-xs font-bold text-ink-muted">
                    {AWARD_LABELS[award.award_type] ?? award.award_type}
                  </span>
                  <span className="font-sans text-xs font-semibold text-ink text-right">{playerName}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="font-marcador text-[10px] uppercase tracking-widest text-ink-muted">{label}</p>
      <p className="mt-1 font-marcador text-2xl font-bold text-ink">
        {value}
        {suffix && <span className="ml-1 font-sans text-xs font-normal text-ink-muted">{suffix}</span>}
      </p>
    </div>
  );
}
