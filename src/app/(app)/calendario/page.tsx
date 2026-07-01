"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchCalendar } from "@/components/calendar/match-calendar";
import type { CalendarMatch } from "@/components/calendar/calendar-match-row";
import { getTeams, getVenues } from "@/lib/data/static-cache";
import { attachPredictionsToCalendarMatches } from "@/lib/calendar/predictions";
import { getAutoScrollDay } from "@/lib/calendar/match-position";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

type StageFilter = "todos" | "grupos" | "eliminatorias";

interface TeamRow {
  id: number;
  name: string;
  flag_emoji: string;
}
interface VenueRow {
  id: number;
  name: string;
  city: string;
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
  match_date: string;
  venue_id: number | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
}

interface PredictionRow {
  match_id: number;
  home_score: number;
  away_score: number;
}

const STAGE_TABS: { key: StageFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "grupos", label: "Grupos" },
  { key: "eliminatorias", label: "Eliminatorias" },
];

export default function CalendarioPage() {
  const [matches, setMatches] = useState<CalendarMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<StageFilter>("todos");
  const [group, setGroup] = useState<string>("todos");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? "";

      const [teamsRes, venuesRes, matchesRes, predictionsRes] = await Promise.all([
        getTeams(),
        getVenues(),
        supabase
          .from("matches")
          .select(
            "id, match_number, stage, group_letter, home_team_id, away_team_id, home_placeholder, away_placeholder, match_date, venue_id, home_score, away_score, is_finished"
          )
          .order("match_date", { ascending: true }),
        uid
          ? supabase
              .from("match_predictions")
              .select("match_id, home_score, away_score")
              .eq("user_id", uid)
          : Promise.resolve({ data: [] as PredictionRow[], error: null }),
      ]);

      const teamMap = new Map<number, TeamRow>(
        (teamsRes as TeamRow[]).map((t) => [t.id, t])
      );
      const venueMap = new Map<number, VenueRow>(
        (venuesRes as VenueRow[]).map((v) => [v.id, v])
      );

      const assembled: CalendarMatch[] = ((matchesRes.data ?? []) as MatchRow[])
        .filter((m) => m.match_date)
        .map((m) => {
          const home = m.home_team_id ? teamMap.get(m.home_team_id) : undefined;
          const away = m.away_team_id ? teamMap.get(m.away_team_id) : undefined;
          const venue = m.venue_id ? venueMap.get(m.venue_id) : undefined;
          return {
            id: m.id,
            match_number: m.match_number,
            stage: m.stage,
            group_letter: m.group_letter,
            match_date: m.match_date,
            is_finished: m.is_finished,
            home_score: m.home_score,
            away_score: m.away_score,
            home: home
              ? { name: home.name, flag_emoji: home.flag_emoji }
              : null,
            away: away
              ? { name: away.name, flag_emoji: away.flag_emoji }
              : null,
            home_team_id: m.home_team_id,
            away_team_id: m.away_team_id,
            home_placeholder: m.home_placeholder,
            away_placeholder: m.away_placeholder,
            venue: venue ? { name: venue.name, city: venue.city } : null,
          };
        });

      setMatches(
        attachPredictionsToCalendarMatches(
          assembled,
          (predictionsRes.data ?? []) as PredictionRow[]
        )
      );
      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      matches.filter((m) => {
        if (stage === "grupos" && m.stage !== "group") return false;
        if (stage === "eliminatorias" && m.stage === "group") return false;
        if (group !== "todos" && m.group_letter !== group) return false;
        return true;
      }),
    [matches, stage, group]
  );

  useEffect(() => {
    if (loading || filtered.length === 0) return;
    const targetDay = getAutoScrollDay(filtered);
    if (!targetDay) return;

    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-day="${targetDay}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [filtered, loading]);

  function jumpToday() {
    const targetDay = getAutoScrollDay(filtered);
    if (!targetDay) return;

    document.querySelector<HTMLElement>(`[data-day="${targetDay}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const showGroupChips = stage !== "eliminatorias";

  return (
    <div className="space-y-3 pb-6">
      {/* Header */}
      <div className="flex items-end justify-between px-1">
        <h1 className="font-marcador text-3xl uppercase text-ink leading-tight">
          Calendario
        </h1>
        <button
          onClick={jumpToday}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 font-marcador text-[11px] font-bold uppercase tracking-wider text-ink-muted"
        >
          Hoy
        </button>
      </div>

      {/* Stage filter */}
      <div className="flex gap-1.5">
        {STAGE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStage(t.key)}
            className={`flex-1 rounded-lg py-2 text-center font-marcador text-[11px] uppercase tracking-wider transition-all ${
              stage === t.key
                ? "bg-red text-white"
                : "border border-border bg-surface text-ink-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Group filter */}
      {showGroupChips && (
        <div className="flex gap-1.5 overflow-x-auto px-1 py-0.5">
          {["todos", ...GROUPS].map((g) => {
            const active = group === g;
            return (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`h-7 shrink-0 rounded-md border px-2 font-marcador text-xs font-bold uppercase ${
                  active
                    ? "border-ink bg-ink text-cream"
                    : "border-border bg-surface text-ink-faint"
                }`}
              >
                {g === "todos" ? "Todos" : g}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-ink-muted animate-pulse">
          Cargando calendario…
        </div>
      ) : (
        <>
          <p className="px-1 font-sans text-[10px] font-bold uppercase tracking-widest text-ink-faint">
            {filtered.length} partidos
          </p>
          <MatchCalendar matches={filtered} />
        </>
      )}
    </div>
  );
}
