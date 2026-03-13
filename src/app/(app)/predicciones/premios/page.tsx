"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Trophy, Medal, Shield } from "lucide-react";

interface Player {
  id: number;
  name: string;
  team_id: number;
}

interface AwardPrediction {
  award_type: string;
  player_id?: number;
  player_name?: string;
}

const AWARDS = [
  { type: "golden_boot", label: "Bota de Oro", description: "Máximo goleador", icon: Trophy },
  { type: "golden_ball", label: "Balón de Oro", description: "Mejor jugador", icon: Medal },
  { type: "golden_glove", label: "Guante de Oro", description: "Mejor portero", icon: Shield },
];

export default function PremiosPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Map<string, AwardPrediction>>(new Map());
  const [isLocked, setIsLocked] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [playersRes, predsRes, configRes] = await Promise.all([
        supabase.from("players").select("*").order("name"),
        supabase.from("award_predictions").select("*").eq("user_id", user.id),
        supabase.from("tournament_config").select("*").eq("key", "predictions_locked").single(),
      ]);

      setPlayers(playersRes.data || []);
      setIsLocked(configRes.data?.value === "true");

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
  }, []);

  const handlePlayerNameChange = (awardType: string, name: string) => {
    setPredictions((prev) => {
      const next = new Map(prev);
      next.set(awardType, { award_type: awardType, player_name: name });
      return next;
    });
  };

  const handlePlayerSelect = (awardType: string, playerId: string) => {
    const player = players.find((p) => p.id === parseInt(playerId));
    setPredictions((prev) => {
      const next = new Map(prev);
      next.set(awardType, {
        award_type: awardType,
        player_id: parseInt(playerId),
        player_name: player?.name,
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!userId || isLocked) return;
    setSaving(true);

    for (const [awardType, pred] of Array.from(predictions.entries())) {
      await supabase.from("award_predictions").upsert(
        {
          user_id: userId,
          award_type: awardType,
          player_id: pred.player_id || null,
          player_name: pred.player_name || null,
        },
        { onConflict: "user_id,award_type" }
      );
    }

    setSaving(false);
    toast({ title: "Premios guardados" });
  };

  const hasPlayers = players.length > 0;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Premios Individuales</h1>
        <p className="text-muted-foreground text-sm">
          Selecciona tus predicciones para los premios (10 pts cada uno)
        </p>
      </div>

      {isLocked && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">Las predicciones están bloqueadas.</p>
          </CardContent>
        </Card>
      )}

      {AWARDS.map(({ type, label, description, icon: Icon }) => {
        const pred = predictions.get(type);
        return (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Icon className="h-5 w-5 text-[hsl(var(--gold))]" />
                {label}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardHeader>
            <CardContent>
              {hasPlayers ? (
                <Select
                  value={pred?.player_id?.toString() || ""}
                  onValueChange={(v) => handlePlayerSelect(type, v)}
                  disabled={isLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar jugador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Label>Nombre del jugador</Label>
                  <Input
                    placeholder="Escribe el nombre..."
                    value={pred?.player_name || ""}
                    onChange={(e) => handlePlayerNameChange(type, e.target.value)}
                    disabled={isLocked}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button onClick={handleSave} disabled={isLocked || saving} className="w-full">
        {saving ? "Guardando..." : "Guardar Premios"}
      </Button>

      <div className="flex justify-between">
        <Link href="/predicciones/eliminatorias">
          <Button variant="outline">← Eliminatorias</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Volver al Inicio</Button>
        </Link>
      </div>
    </div>
  );
}
