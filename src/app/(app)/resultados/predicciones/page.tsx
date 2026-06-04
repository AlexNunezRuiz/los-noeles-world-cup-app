"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Flag } from "@/components/ui/flag";
import { isPredictionsLocked } from "@/lib/predictions/lock";
import {
  buildMatchSearchLabel,
  getInitialSelectedMatchId,
  sortProfilesByCurrentRanking,
  type RankedPredictionProfile,
} from "@/lib/results/prediction-compare";

interface ConfigRow {
  key: string;
  value: string;
}

interface ProfileRow {
  id: string;
  display_name: string;
  has_paid: boolean;
}

interface TeamRow {
  id: number;
  name: string;
  flag_emoji: string;
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
}

interface PredictionRow {
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  penalty_winner: "home" | "away" | null;
}

interface UserScoreRow {
  user_id: string;
  total_points: number;
}

export default function PredictionComparePage() {
  const [isLocked, setIsLocked] = useState(false);
  const [rankedProfiles, setRankedProfiles] = useState<RankedPredictionProfile[]>([]);
  const [teams, setTeams] = useState<Map<number, TeamRow>>(new Map());
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [matchSearch, setMatchSearch] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? null;

      const [
        { data: config },
        { data: profileRows },
        { data: teamRows },
        { data: matchRows },
        { data: scoreRows },
      ] =
        await Promise.all([
          supabase.from("tournament_config").select("key, value"),
          supabase.from("profiles").select("id, display_name, has_paid").order("display_name"),
          supabase.from("teams").select("id, name, flag_emoji"),
          supabase
            .from("matches")
            .select("id, match_number, stage, group_letter, home_team_id, away_team_id, home_placeholder, away_placeholder, match_date")
            .order("match_number"),
          supabase
            .from("user_scores")
            .select("user_id, total_points")
            .order("total_points", { ascending: false }),
        ]);

      const locked = isPredictionsLocked((config ?? []) as ConfigRow[]);
      const loadedProfiles = (profileRows ?? []) as ProfileRow[];
      const loadedMatches = (matchRows ?? []) as MatchRow[];
      setIsLocked(locked);
      setRankedProfiles(
        sortProfilesByCurrentRanking(
          loadedProfiles,
          (scoreRows ?? []) as UserScoreRow[],
          uid
        )
      );
      setMatches(loadedMatches);
      setTeams(new Map(((teamRows ?? []) as TeamRow[]).map((team) => [team.id, team])));
      setSelectedMatchId(
        getInitialSelectedMatchId(
          loadedMatches.map((match) => match.id),
          searchParams.get("partido")
        )
      );

      if (locked) {
        const { data: predictionRows } = await supabase
          .from("match_predictions")
          .select("user_id, match_id, home_score, away_score, penalty_winner");
        setPredictions((predictionRows ?? []) as PredictionRow[]);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? null;
  const predictionsByUser = useMemo(() => {
    const map = new Map<string, PredictionRow>();
    for (const prediction of predictions) {
      if (prediction.match_id === selectedMatchId) map.set(prediction.user_id, prediction);
    }
    return map;
  }, [predictions, selectedMatchId]);

  const getMatchNames = useCallback((match: MatchRow) => {
    const home = match.home_team_id ? teams.get(match.home_team_id) : null;
    const away = match.away_team_id ? teams.get(match.away_team_id) : null;

    return {
      homeTeam: home,
      awayTeam: away,
      homeName: home?.name ?? match.home_placeholder ?? "Por decidir",
      awayName: away?.name ?? match.away_placeholder ?? "Por decidir",
    };
  }, [teams]);

  const matchOptions = useMemo(
    () =>
      matches.map((match) => {
        const { homeName, awayName } = getMatchNames(match);
        return {
          id: match.id,
          label: buildMatchSearchLabel({
            match_number: match.match_number,
            stage: match.stage,
            group_letter: match.group_letter,
            homeName,
            awayName,
          }),
        };
      }),
    [getMatchNames, matches]
  );

  const filteredMatchOptions = useMemo(() => {
    const query = matchSearch
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (!query) return matchOptions;

    return matchOptions.filter((option) =>
      option.label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(query)
    );
  }, [matchOptions, matchSearch]);

  const homeTeam = selectedMatch?.home_team_id ? teams.get(selectedMatch.home_team_id) : null;
  const awayTeam = selectedMatch?.away_team_id ? teams.get(selectedMatch.away_team_id) : null;
  const homeName = homeTeam?.name ?? selectedMatch?.home_placeholder ?? "Por decidir";
  const awayName = awayTeam?.name ?? selectedMatch?.away_placeholder ?? "Por decidir";

  if (!isLocked) {
    return (
      <div className="space-y-4 pt-1">
        <Link href="/resultados" className="text-xs font-semibold text-ink-muted hover:text-ink">
          ← Resultados
        </Link>
        <div className="rounded-xl border border-border bg-surface p-5">
          <h1 className="font-marcador text-3xl uppercase text-ink">Predicciones</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Las predicciones de otros jugadores se podrán ver cuando se cierre la porra.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 pt-1">
      <Link href="/resultados" className="text-xs font-semibold text-ink-muted hover:text-ink">
        ← Resultados
      </Link>

      <div>
        <h1 className="font-marcador text-3xl uppercase text-ink">Predicciones</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
          Consulta qué ha puesto cada jugador
        </p>
      </div>

      <div className="space-y-2">
        <input
          value={matchSearch}
          onChange={(event) => setMatchSearch(event.target.value)}
          placeholder="Buscar partido: Canada, Mexico, 1A, Octavos..."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
      <select
          value={selectedMatchId ?? ""}
          onChange={(event) => {
            const nextMatchId = Number(event.target.value);
            setSelectedMatchId(nextMatchId);
            router.replace(`/resultados/predicciones?partido=${nextMatchId}`, {
              scroll: false,
            });
          }}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
        >
          {filteredMatchOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {filteredMatchOptions.length === 0 && (
          <p className="px-1 text-xs text-ink-muted">
            No hay partidos que coincidan con la busqueda.
          </p>
        )}
      </div>

      {selectedMatch && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-center gap-3">
            <span className="flex min-w-0 items-center gap-2 text-right text-sm font-bold text-ink">
              {homeTeam && <Flag emoji={homeTeam.flag_emoji} size={20} />}
              {homeName}
            </span>
            <span className="font-marcador text-xs text-ink-muted">VS</span>
            <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-ink">
              {awayTeam && <Flag emoji={awayTeam.flag_emoji} size={20} />}
              {awayName}
            </span>
          </div>

          <div className="divide-y divide-border">
            {rankedProfiles.map((profile) => {
              const prediction = predictionsByUser.get(profile.id);
              const passLabel =
                prediction?.home_score === prediction?.away_score && prediction?.penalty_winner
                  ? prediction.penalty_winner === "home"
                    ? homeName
                    : awayName
                  : null;
              return (
                <div
                  key={profile.id}
                  className={`flex items-center justify-between gap-3 px-2 py-2 ${
                    profile.isCurrentUser
                      ? "rounded-lg border border-blue/40 bg-blue/10"
                      : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-8 shrink-0 text-center font-marcador text-sm text-ink-muted">
                      {profile.rank ? `#${profile.rank}` : "-"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{profile.display_name}</p>
                        {profile.isCurrentUser && (
                          <span className="shrink-0 rounded bg-blue px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                            Tu
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                        {profile.has_paid
                          ? `${profile.totalPoints} pts`
                          : "Pendiente pago"}
                      </p>
                    </div>
                  </div>
                  {prediction ? (
                    <div className="text-right">
                      <p className="font-marcador text-xl text-ink">
                        {prediction.home_score} - {prediction.away_score}
                      </p>
                      {passLabel && (
                        <p className="text-[10px] font-bold uppercase text-green">Pasa {passLabel}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-ink-faint">Sin pronóstico</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
