"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";

interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
}

interface Props {
  matchId: number;
  matchNumber: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  isLocked: boolean;
  matchDate?: string;
  onScoreChange: (matchId: number, homeScore: number, awayScore: number) => void;
}

export function GroupMatchCard({
  matchId,
  matchNumber,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  isLocked,
  matchDate,
  onScoreChange,
}: Props) {
  const [home, setHome] = useState(homeScore);
  const [away, setAway] = useState(awayScore);

  useEffect(() => {
    setHome(homeScore);
    setAway(awayScore);
  }, [homeScore, awayScore]);

  const handleChange = useCallback(
    (side: "home" | "away", value: string) => {
      const num = Math.max(0, Math.min(99, parseInt(value) || 0));
      if (side === "home") {
        setHome(num);
        onScoreChange(matchId, num, away);
      } else {
        setAway(num);
        onScoreChange(matchId, home, num);
      }
    },
    [matchId, home, away, onScoreChange]
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        {matchDate && (
          <p className="text-xs text-muted-foreground mb-2 text-center">
            P{matchNumber} &middot;{" "}
            {new Date(matchDate).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          {/* Home team */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Flag emoji={homeTeam.flag_emoji} size={24} />
            <span className="text-sm font-medium truncate">{homeTeam.name}</span>
          </div>

          {/* Score inputs */}
          <div className="flex items-center gap-1 shrink-0">
            <Input
              type="number"
              min={0}
              max={99}
              value={home}
              onChange={(e) => handleChange("home", e.target.value)}
              disabled={isLocked}
              className={cn(
                "w-12 h-10 text-center text-lg font-bold p-0",
                "bg-secondary border-primary/20 focus:border-primary"
              )}
            />
            <span className="text-muted-foreground font-bold mx-1">-</span>
            <Input
              type="number"
              min={0}
              max={99}
              value={away}
              onChange={(e) => handleChange("away", e.target.value)}
              disabled={isLocked}
              className={cn(
                "w-12 h-10 text-center text-lg font-bold p-0",
                "bg-secondary border-primary/20 focus:border-primary"
              )}
            />
          </div>

          {/* Away team */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="text-sm font-medium truncate text-right">{awayTeam.name}</span>
            <Flag emoji={awayTeam.flag_emoji} size={24} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
