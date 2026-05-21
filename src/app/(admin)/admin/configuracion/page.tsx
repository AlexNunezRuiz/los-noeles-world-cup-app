"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

interface ScoringRule {
  id: number;
  category: string;
  rule_key: string;
  points: number;
  description: string;
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [configRes, rulesRes] = await Promise.all([
        supabase.from("tournament_config").select("*"),
        supabase.from("scoring_rules").select("*").order("id"),
      ]);

      const configMap: Record<string, string> = {};
      for (const c of configRes.data || []) {
        configMap[c.key] = c.value;
      }
      setConfig(configMap);
      setScoringRules(rulesRes.data || []);
    }
    load();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(config)) {
      await supabase
        .from("tournament_config")
        .upsert({ key, value }, { onConflict: "key" });
    }
    setSaving(false);
    toast({ title: "Configuración guardada" });
  };

  const handleSaveRules = async () => {
    setSaving(true);
    for (const rule of scoringRules) {
      await supabase
        .from("scoring_rules")
        .update({ points: rule.points })
        .eq("id", rule.id);
    }
    setSaving(false);
    toast({ title: "Reglas de puntuación guardadas" });
  };

  const isLocked = config.predictions_locked === "true";

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="font-marcador font-bold uppercase tracking-wide text-2xl text-ink">Configuración</h1>

      {/* Lock predictions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Predicciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-ink">Bloquear predicciones</Label>
              <p className="text-xs text-ink-muted mt-0.5">
                Impide que los usuarios editen sus pronósticos
              </p>
            </div>
            <Switch
              checked={isLocked}
              onCheckedChange={(v) =>
                setConfig((prev) => ({ ...prev, predictions_locked: v ? "true" : "false" }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-ink">Fecha límite</Label>
            <Input
              type="datetime-local"
              value={config.lock_datetime ? new Date(config.lock_datetime).toISOString().slice(0, 16) : ""}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, lock_datetime: new Date(e.target.value).toISOString() }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Bizum */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Bizum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-ink">Teléfono</Label>
            <Input
              value={config.bizum_phone || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, bizum_phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-ink">Cantidad (€)</Label>
            <Input
              value={config.bizum_amount || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, bizum_amount: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSaveConfig} disabled={saving} className="w-full">
        Guardar Configuración
      </Button>

      <div className="border-t border-border" />

      {/* Scoring rules */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Reglas de Puntuación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scoringRules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{rule.description}</p>
                <p className="text-xs text-ink-faint">{rule.rule_key}</p>
              </div>
              <Input
                type="number"
                className="w-20 h-8 text-center text-sm font-marcador"
                value={rule.points}
                onChange={(e) =>
                  setScoringRules((prev) =>
                    prev.map((r) =>
                      r.id === rule.id ? { ...r, points: parseInt(e.target.value) || 0 } : r
                    )
                  )
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSaveRules} disabled={saving} className="w-full">
        Guardar Reglas
      </Button>
    </div>
  );
}
