"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [savedConfig, setSavedConfig] = useState<Record<string, string>>({});
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [savedScoringRules, setSavedScoringRules] = useState<ScoringRule[]>([]);
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
      setSavedConfig(configMap);
      setScoringRules(rulesRes.data || []);
      setSavedScoringRules(rulesRes.data || []);
    }
    load();
  }, []);

  const publishAdminUpdate = async (message: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: chatMessage } = await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, message })
      .select("id")
      .single();

    const { data: profiles } = await supabase.from("profiles").select("id");
    const rows = ((profiles || []) as Array<{ id: string }>).map((profile) => ({
      user_id: profile.id,
      actor_user_id: user.id,
      type: "admin_update",
      message_id: chatMessage?.id ?? null,
    }));

    if (rows.length > 0) {
      await supabase.from("notifications").insert(rows);
    }
  };

  const configChangeSummary = () => {
    const labels: Record<string, string> = {
      predictions_locked: "bloqueo de predicciones",
      lock_datetime: "fecha limite",
      bank_account_holder: "titular de la cuenta",
      bank_iban: "numero de cuenta",
      bank_concept_prefix: "concepto del pago",
      payment_amount: "precio de la porra",
    };
    return Object.keys(labels)
      .filter((key) => (config[key] ?? "") !== (savedConfig[key] ?? ""))
      .map((key) => labels[key]);
  };

  const rulesChangeSummary = () => {
    const savedById = new Map(savedScoringRules.map((rule) => [rule.id, rule.points]));
    return scoringRules
      .filter((rule) => savedById.get(rule.id) !== rule.points)
      .map((rule) => rule.description || rule.rule_key);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    const changed = configChangeSummary();
    for (const [key, value] of Object.entries(config)) {
      await supabase
        .from("tournament_config")
        .upsert({ key, value }, { onConflict: "key" });
    }
    if (changed.length > 0) {
      await publishAdminUpdate(`Se ha actualizado la configuracion de la porra: ${changed.join(", ")}.`);
      setSavedConfig({ ...config });
    }
    setSaving(false);
    toast({ title: "Configuración guardada" });
  };

  const handleSaveRules = async () => {
    setSaving(true);
    const changed = rulesChangeSummary();
    for (const rule of scoringRules) {
      await supabase
        .from("scoring_rules")
        .update({ points: rule.points })
        .eq("id", rule.id);
    }
    if (changed.length > 0) {
      await publishAdminUpdate(`Se han actualizado las reglas de puntuacion: ${changed.join(", ")}.`);
      setSavedScoringRules(scoringRules.map((rule) => ({ ...rule })));
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

      {/* Transferencia */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Pago por transferencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-ink">Titular</Label>
            <Input
              value={config.bank_account_holder || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, bank_account_holder: e.target.value }))}
              placeholder="Nombre del titular"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-ink">Numero de cuenta / IBAN</Label>
            <Input
              value={config.bank_iban || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, bank_iban: e.target.value.toUpperCase() }))}
              placeholder="ES00 0000 0000 0000 0000 0000"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-ink">Mensaje para incluir en el concepto</Label>
            <Input
              value={config.bank_concept_prefix || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, bank_concept_prefix: e.target.value }))}
              placeholder="PORRA"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-ink">Cantidad (€)</Label>
            <Input
              value={config.payment_amount || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, payment_amount: e.target.value }))}
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
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{rule.category}</Badge>
                  <p className="text-xs text-ink-faint">{rule.rule_key}</p>
                </div>
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
