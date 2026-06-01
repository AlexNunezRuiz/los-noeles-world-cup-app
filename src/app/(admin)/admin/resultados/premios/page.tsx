"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, Medal, Shield } from "lucide-react";

interface Player {
  id: number;
  name: string;
  teams?: { name: string; code: string } | { name: string; code: string }[] | null;
}

const AWARDS = [
  { type: "golden_boot", label: "Bota de Oro", icon: Trophy },
  { type: "golden_ball", label: "Balón de Oro", icon: Medal },
  { type: "golden_glove", label: "Guante de Oro", icon: Shield },
];

export default function AdminPremiosPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [awards, setAwards] = useState<Record<string, { player_id?: number; player_name?: string }>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [playersRes, awardsRes] = await Promise.all([
        supabase.from("players").select("id, name, teams(name, code)").order("name"),
        supabase.from("actual_awards").select("*"),
      ]);
      setPlayers(playersRes.data || []);

      const awardsMap: Record<string, { player_id?: number; player_name?: string }> = {};
      for (const a of awardsRes.data || []) {
        awardsMap[a.award_type] = { player_id: a.player_id, player_name: a.player_name };
      }
      setAwards(awardsMap);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);

    for (const { type } of AWARDS) {
      const award = awards[type];
      if (!award?.player_name && !award?.player_id) continue;

      await supabase.from("actual_awards").upsert(
        {
          award_type: type,
          player_id: award.player_id || null,
          player_name: award.player_name || null,
        },
        { onConflict: "award_type" }
      );
    }

    setSaving(false);
    toast({ title: "Premios reales guardados" });
  };

  const hasPlayers = players.length > 0;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="font-marcador font-bold uppercase tracking-wide text-2xl text-ink">Premios Reales</h1>

      {AWARDS.map(({ type, label, icon: Icon }) => (
        <Card key={type} className="bg-surface border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-marcador uppercase tracking-wide flex items-center gap-2 text-ink">
              <Icon className="h-5 w-5 text-gold" />
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasPlayers ? (
              <Select
                value={awards[type]?.player_id?.toString() || ""}
                onValueChange={(v) => {
                  const player = players.find((p) => p.id === parseInt(v));
                  setAwards((prev) => ({
                    ...prev,
                    [type]: { player_id: parseInt(v), player_name: player?.name },
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ganador..." />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                      {(() => {
                        const team = Array.isArray(p.teams) ? p.teams[0] : p.teams;
                        return team ? ` · ${team.name} (${team.code})` : "";
                      })()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Label className="text-ink-muted">Nombre del ganador</Label>
                <Input
                  value={awards[type]?.player_name || ""}
                  onChange={(e) =>
                    setAwards((prev) => ({
                      ...prev,
                      [type]: { player_name: e.target.value },
                    }))
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Guardando..." : "Guardar Premios Reales"}
      </Button>
    </div>
  );
}
