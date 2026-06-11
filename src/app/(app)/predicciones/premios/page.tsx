"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlayerCombobox } from "@/components/ui/player-combobox";
import { StageBar } from "@/components/porra/stage-bar";
import { Trophy, Star, Shield } from "lucide-react";
import { usePredictionLockRealtime } from "@/lib/predictions/use-lock-realtime";
import { canEditPredictions } from "@/lib/predictions/lock";

interface Player {
  id: number;
  name: string;
  team_id: number;
  teams?: { name: string; code: string; flag_emoji: string } | { name: string; code: string; flag_emoji: string }[] | null;
}

interface AwardPrediction {
  award_type: string;
  player_id?: number;
  player_name?: string;
}

interface ConfigRow {
  key: string;
  value: string;
}

const AWARDS = [
  {
    type: "golden_boot",
    label: "Bota de Oro",
    description: "Máximo goleador del torneo",
    icon: Trophy,
    points: 10,
  },
  {
    type: "golden_ball",
    label: "Balón de Oro",
    description: "Mejor jugador del torneo",
    icon: Star,
    points: 10,
  },
  {
    type: "golden_glove",
    label: "Guante de Oro",
    description: "Mejor portero del torneo",
    icon: Shield,
    points: 10,
  },
];

export default function PremiosPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Map<string, AwardPrediction>>(new Map());
  const [isLocked, setIsLocked] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { setLockConfigRows } = usePredictionLockRealtime(supabase, setIsLocked);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [playersRes, predsRes, configRes] = await Promise.all([
        supabase
          .from("players")
          .select("id, name, team_id, teams(name, code, flag_emoji)")
          .order("name")
          .range(0, 1999),
        supabase.from("award_predictions").select("*").eq("user_id", user.id),
        supabase.from("tournament_config").select("key, value"),
      ]);

      setPlayers(playersRes.data || []);
      setLockConfigRows((configRes.data ?? []) as ConfigRow[]);

      const predMap = new Map<string, AwardPrediction>();
      for (const p of predsRes.data || []) {
        predMap.set(p.award_type, {
          award_type: p.award_type,
          player_id: p.player_id,
          player_name: p.player_name,
        });
      }
      setPredictions(predMap);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsertAward = useCallback(
    async (awardType: string, playerId: number, playerName: string | undefined) => {
      if (!userId || isLocked) return;
      setSaving(true);
      await supabase.from("award_predictions").upsert(
        {
          user_id: userId,
          award_type: awardType,
          player_id: playerId,
          player_name: playerName ?? null,
        },
        { onConflict: "user_id,award_type" }
      );
      setSaving(false);
    },
    [userId, isLocked, supabase]
  );

  const handlePlayerSelect = useCallback(
    (awardType: string, playerId: number) => {
      if (!canEditPredictions(isLocked)) return;
      const player = players.find((p) => p.id === playerId);
      setPredictions((prev) => {
        const next = new Map(prev);
        next.set(awardType, {
          award_type: awardType,
          player_id: playerId,
          player_name: player?.name,
        });
        return next;
      });
      upsertAward(awardType, playerId, player?.name);
    },
    [isLocked, players, upsertAward]
  );

  const chosenCount = AWARDS.filter((a) => predictions.get(a.type)?.player_id).length;
  const premiosPct = Math.round((chosenCount / 3) * 100);

  return (
    <div className="pb-8">
      {/* Stage progress bar */}
      <StageBar progress={{ premios: premiosPct }} />

      {/* Header */}
      <div className="px-4 pt-3 pb-4">
        <h1 className="font-marcador text-3xl uppercase text-ink leading-none">Premios</h1>
        <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-widest text-ink-muted">
          Premios individuales · {chosenCount} de 3 elegidos · 10 pts cada uno
          {saving && " · guardando…"}
        </p>
      </div>

      {/* Locked notice */}
      {isLocked && (
        <div className="mx-4 mb-4 rounded-xl border border-red/30 bg-red/8 px-3 py-2">
          <p className="text-sm font-semibold text-red">Las predicciones están bloqueadas.</p>
        </div>
      )}

      {/* Award cards */}
      <div className="flex flex-col gap-3 px-4">
        {AWARDS.map(({ type, label, description, icon: Icon, points }) => {
          const pred = predictions.get(type);
          const hasSelection = !!pred?.player_id;

          return (
            <div
              key={type}
              className="bg-surface border border-border rounded-xl p-4"
            >
              {/* Card header */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-sunken">
                  <Icon className="h-4 w-4 text-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-marcador text-base uppercase text-ink leading-none tracking-wide">
                    {label}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                    {description} · {points} pts
                  </p>
                </div>
                {hasSelection && (
                  <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 font-marcador text-[10px] font-bold uppercase tracking-wide text-gold">
                    ✓
                  </span>
                )}
              </div>

              {/* Player combobox */}
              <PlayerCombobox
                options={players.map((p) => {
                  const team = Array.isArray(p.teams) ? p.teams[0] : p.teams;
                  return {
                    id: p.id,
                    name: p.name,
                    team: team?.name,
                    teamFlag: team?.flag_emoji,
                  };
                })}
                value={pred?.player_id ?? null}
                onChange={(id) => handlePlayerSelect(type, id)}
                disabled={isLocked || players.length === 0}
                placeholder="Seleccionar jugador…"
              />

              {/* Chosen player name */}
              {hasSelection && (
                <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  Elegido: <span className="text-ink">{pred?.player_name}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
