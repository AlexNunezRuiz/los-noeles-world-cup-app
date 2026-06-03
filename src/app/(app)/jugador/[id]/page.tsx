"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BreakdownBar } from "@/components/ranking/breakdown-bar";
import { Flag } from "@/components/ui/flag";

// ── DB row interfaces ─────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  display_name: string;
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
}

interface MatchPredictionRow {
  id: string;
  match_id: number;
  home_score: number;
  away_score: number;
}

interface PredictedGroupStandingRow {
  id: string;
  group_letter: string;
  team_id: number;
  position: number;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const AWARD_LABELS: Record<string, string> = {
  golden_boot: "Bota de Oro",
  golden_ball: "Balón de Oro",
  golden_glove: "Guante de Oro",
};

const STAGE_LABELS: Record<string, string> = {
  round_of_32: "Ronda de 32",
  round_of_16: "Octavos de final",
  quarter_final: "Cuartos de final",
  semi_final: "Semifinal",
  third_place: "Tercer puesto",
  final: "Final",
};

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;

    async function load() {
      const supabase = createClient();

      const [
        { data: profileData },
        { data: scoresData },
        { data: predictionsData },
        { data: standingsData },
        { data: awardsData },
        { data: teamsData },
        { data: matchesData },
        { data: playersData },
      ] = await Promise.all([
        supabase.from("profiles").select("id, display_name").eq("id", playerId).single(),
        supabase.from("user_scores").select("user_id, total_points, group_stage_points, knockout_exact_points, qualification_points, award_points").eq("user_id", playerId).single(),
        supabase.from("match_predictions").select("id, match_id, home_score, away_score").eq("user_id", playerId),
        supabase.from("predicted_group_standings").select("id, group_letter, team_id, position").eq("user_id", playerId).order("group_letter").order("position"),
        supabase.from("award_predictions").select("id, award_type, player_id, player_name").eq("user_id", playerId),
        supabase.from("teams").select("id, name, flag_emoji, group_letter"),
        supabase.from("matches").select("id, match_number, stage, group_letter, home_team_id, away_team_id, home_placeholder, away_placeholder").order("match_number"),
        supabase.from("players").select("id, name, team_id"),
      ]);

      setProfile(profileData as ProfileRow | null);
      setScores(scoresData as UserScoreRow | null);
      setMatchPredictions((predictionsData ?? []) as MatchPredictionRow[]);
      setGroupStandings((standingsData ?? []) as PredictedGroupStandingRow[]);
      setAwardPredictions((awardsData ?? []) as AwardPredictionRow[]);

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

  const groupPredictions: Array<{ match: MatchRow; pred: MatchPredictionRow }> = [];
  const knockoutPredictions: Array<{ match: MatchRow; pred: MatchPredictionRow }> = [];

  for (const [matchId, pred] of predictionsByMatchId) {
    const match = matches.get(matchId);
    if (!match) continue;
    if (match.stage === "group") {
      groupPredictions.push({ match, pred });
    } else {
      knockoutPredictions.push({ match, pred });
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
  const groupPoints = scores?.group_stage_points ?? 0;
  const knockoutPoints = scores?.knockout_exact_points ?? 0;
  const qualPoints = scores?.qualification_points ?? 0;
  const awardPoints = scores?.award_points ?? 0;

  // Knockout predictions grouped by stage
  const knockoutByStage = new Map<string, Array<{ match: MatchRow; pred: MatchPredictionRow }>>();
  for (const item of knockoutPredictions) {
    const stage = item.match.stage;
    const arr = knockoutByStage.get(stage) ?? [];
    arr.push(item);
    knockoutByStage.set(stage, arr);
  }

  const stageOrder = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];

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
          <h1 className="font-marcador text-3xl uppercase text-ink leading-tight">
            {profile.display_name}
          </h1>
          <span className="font-marcador text-3xl font-bold text-ink leading-tight flex-shrink-0">
            {totalPoints}
            <span className="text-sm font-sans font-normal text-ink-muted ml-1">pts</span>
          </span>
        </div>
        <BreakdownBar
          grupos={groupPoints}
          cuadro={knockoutPoints}
          clasif={qualPoints}
          premios={awardPoints}
        />
      </div>

      {/* Fase de grupos */}
      <section className="space-y-2">
        <SectionTitle>Fase de grupos</SectionTitle>
        {groupPredictions.length === 0 ? (
          <EmptyState label="Sin pronósticos de fase de grupos" />
        ) : (
          <div className="rounded-xl border border-border bg-surface px-3">
            {groupPredictions.map(({ match, pred }) => renderMatchRow(match, pred))}
          </div>
        )}
      </section>

      {/* Clasificados de grupo */}
      {standingsByGroup.size > 0 && (
        <section className="space-y-2">
          <SectionTitle>Clasificados por grupo</SectionTitle>
          <div className="space-y-2">
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
        <SectionTitle>Eliminatorias</SectionTitle>
        {knockoutPredictions.length === 0 ? (
          <EmptyState label="Sin pronósticos de eliminatorias" />
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
    </div>
  );
}
