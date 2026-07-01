"use client";

import Link from "next/link";
import { Flag } from "@/components/ui/flag";
import { FlapTile } from "@/components/ui/flap-tile";
import { formatKickoff } from "@/lib/datetime";
import { stageLabel } from "@/lib/tournament/labels";
import type { CalendarPrediction } from "@/lib/calendar/predictions";

export interface CalendarTeam {
  name: string;
  flag_emoji: string;
}

export interface CalendarMatch {
  id: number;
  match_number: number;
  stage: string;
  group_letter: string | null;
  match_date: string;
  is_finished: boolean;
  home_score: number | null;
  away_score: number | null;
  home: CalendarTeam | null;
  away: CalendarTeam | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  venue: { name: string; city: string } | null;
  prediction?: CalendarPrediction | null;
}

function TeamSide({
  team,
  placeholder,
  align,
}: {
  team: CalendarTeam | null;
  placeholder: string | null;
  align: "left" | "right";
}) {
  const reverse = align === "right";
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        reverse ? "flex-row-reverse" : ""
      }`}
    >
      {team ? (
        <>
          <Flag emoji={team.flag_emoji} size={20} />
          <span
            className={`truncate text-sm font-bold text-ink ${
              reverse ? "text-right" : ""
            }`}
          >
            {team.name}
          </span>
        </>
      ) : (
        <span
          className={`truncate font-marcador text-xs uppercase text-ink-faint ${
            reverse ? "text-right" : ""
          }`}
        >
          {placeholder ?? "—"}
        </span>
      )}
    </div>
  );
}

export function CalendarMatchRow({ match }: { match: CalendarMatch }) {
  const finished =
    match.is_finished &&
    match.home_score !== null &&
    match.away_score !== null;

  return (
    <Link
      href={`/resultados/predicciones?partido=${match.id}`}
      className="block rounded-xl border border-border bg-surface p-3 transition-colors hover:border-blue/60 focus:outline-none focus:ring-2 focus:ring-blue/30"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-marcador text-sm font-bold text-ink">
          {formatKickoff(match.match_date)}
        </span>
        <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-ink-faint">
          {stageLabel(match.stage, match.group_letter)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <TeamSide
          team={match.home}
          placeholder={match.home_placeholder}
          align="left"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          {finished ? (
            <>
              <FlapTile value={match.home_score} size="sm" />
              <FlapTile value={match.away_score} size="sm" />
            </>
          ) : (
            <span className="font-marcador text-xs font-bold text-ink-faint">
              VS
            </span>
          )}
        </div>
        <TeamSide
          team={match.away}
          placeholder={match.away_placeholder}
          align="right"
        />
      </div>

      {match.venue && (
        <p className="mt-2 truncate border-t border-dashed border-border pt-2 text-[10px] text-ink-muted">
          {match.venue.name} · {match.venue.city}
        </p>
      )}
      {match.prediction && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-blue/30 bg-blue/10 px-2 py-1.5">
          <span className="font-marcador text-[10px] font-bold uppercase tracking-wider text-blue">
            Tu pronostico
          </span>
          <span className="font-marcador text-sm font-bold text-ink">
            {match.prediction.home} - {match.prediction.away}
          </span>
        </div>
      )}
    </Link>
  );
}
