"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
}

interface KnockoutMatchData {
  match_number: number;
  stage: string;
  home_team_id?: number;
  away_team_id?: number;
  home_placeholder?: string;
  away_placeholder?: string;
  home_score?: number;
  away_score?: number;
  penalty_winner?: "home" | "away";
}

interface Props {
  matches: KnockoutMatchData[];
  teams: Map<number, Team>;
  isLocked: boolean;
  onScoreChange: (matchNumber: number, homeScore: number, awayScore: number) => void;
  onPenaltyWinner: (matchNumber: number, winner: "home" | "away") => void;
}

const STAGE_LABELS: Record<string, string> = {
  round_of_32: "Octavos de Final",
  round_of_16: "Cuartos de Final",
  quarter_final: "Semifinales",
  semi_final: "Semifinales",
  third_place: "3er/4to Puesto",
  final: "Final",
};

export function KnockoutBracket({ matches, teams, isLocked, onScoreChange, onPenaltyWinner }: Props) {
  const stages = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];

  return (
    <div className="space-y-8">
      {stages.map((stage) => {
        const stageMatches = matches.filter((m) => m.stage === stage);
        if (stageMatches.length === 0) return null;

        return (
          <div key={stage}>
            <h3 className="text-lg font-bold mb-3">{STAGE_LABELS[stage] || stage}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stageMatches.map((match) => {
                const homeTeam = match.home_team_id ? teams.get(match.home_team_id) : null;
                const awayTeam = match.away_team_id ? teams.get(match.away_team_id) : null;
                const isDraw =
                  match.home_score !== undefined &&
                  match.away_score !== undefined &&
                  match.home_score === match.away_score;
                const hasTeams = homeTeam && awayTeam;

                return (
                  <Card key={match.match_number} className={cn(!hasTeams && "opacity-60")}>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        P{match.match_number}
                      </p>

                      {/* Home */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-lg">{homeTeam?.flag_emoji || "❓"}</span>
                          <span className="text-sm font-medium truncate">
                            {homeTeam?.name || match.home_placeholder || "TBD"}
                          </span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          value={match.home_score ?? ""}
                          onChange={(e) =>
                            onScoreChange(
                              match.match_number,
                              parseInt(e.target.value) || 0,
                              match.away_score ?? 0
                            )
                          }
                          disabled={isLocked || !hasTeams}
                          className="w-12 h-8 text-center text-sm font-bold p-0 bg-secondary"
                        />
                      </div>

                      {/* Away */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-lg">{awayTeam?.flag_emoji || "❓"}</span>
                          <span className="text-sm font-medium truncate">
                            {awayTeam?.name || match.away_placeholder || "TBD"}
                          </span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          value={match.away_score ?? ""}
                          onChange={(e) =>
                            onScoreChange(
                              match.match_number,
                              match.home_score ?? 0,
                              parseInt(e.target.value) || 0
                            )
                          }
                          disabled={isLocked || !hasTeams}
                          className="w-12 h-8 text-center text-sm font-bold p-0 bg-secondary"
                        />
                      </div>

                      {/* Penalty winner */}
                      {isDraw && hasTeams && (
                        <div className="mt-2 border-t pt-2">
                          <p className="text-xs text-muted-foreground mb-1">Ganador penaltis:</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={match.penalty_winner === "home" ? "default" : "outline"}
                              className="text-xs h-7 flex-1"
                              onClick={() => onPenaltyWinner(match.match_number, "home")}
                              disabled={isLocked}
                            >
                              {homeTeam?.flag_emoji} {homeTeam?.code}
                            </Button>
                            <Button
                              size="sm"
                              variant={match.penalty_winner === "away" ? "default" : "outline"}
                              className="text-xs h-7 flex-1"
                              onClick={() => onPenaltyWinner(match.match_number, "away")}
                              disabled={isLocked}
                            >
                              {awayTeam?.flag_emoji} {awayTeam?.code}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
