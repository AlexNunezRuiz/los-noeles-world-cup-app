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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRIZE_RECIPIENT_LABELS,
  PrizeConfig,
  PrizeRecipient,
  PrizeType,
  parseEditablePrizeDistribution,
  parsePaymentAmount,
  prizeDistributionPercentTotal,
  serializePrizeDistribution,
} from "@/lib/prizes/config";
import { buildNotificationRows } from "@/lib/notifications/internal";

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
  const [prizeDistribution, setPrizeDistribution] = useState<PrizeConfig[]>([]);
  const [savedPrizeDistribution, setSavedPrizeDistribution] = useState<PrizeConfig[]>([]);
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
      const prizes = parseEditablePrizeDistribution(
        configMap.prize_distribution,
        parsePaymentAmount(configMap.payment_amount)
      );
      setConfig(configMap);
      setSavedConfig(configMap);
      setPrizeDistribution(prizes);
      setSavedPrizeDistribution(prizes.map((item) => ({ ...item })));
      setScoringRules(rulesRes.data || []);
      setSavedScoringRules(rulesRes.data || []);
    }
    load();
  }, []);

  const publishAdminUpdate = async (message: string, title = "Configuracion actualizada") => {
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
    const rows = buildNotificationRows({
      profiles: (profiles || []) as Array<{ id: string }>,
      type: "config_update",
      actorUserId: user.id,
      messageId: chatMessage?.id ?? null,
      title,
      body: message,
      link: "/normas",
    });

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
      prize_distribution: "reparto de premios",
    };
    const currentConfig: Record<string, string> = {
      ...config,
      prize_distribution: serializePrizeDistribution(prizeDistribution),
    };
    const previousConfig: Record<string, string> = {
      ...savedConfig,
      prize_distribution: serializePrizeDistribution(savedPrizeDistribution),
    };
    return Object.keys(labels)
      .filter((key) => (currentConfig[key] ?? "") !== (previousConfig[key] ?? ""))
      .map((key) => labels[key]);
  };

  const rulesChangeSummary = () => {
    const savedById = new Map(savedScoringRules.map((rule) => [rule.id, rule.points]));
    return scoringRules
      .filter((rule) => savedById.get(rule.id) !== rule.points)
      .map((rule) => rule.description || rule.rule_key);
  };

  const saveConfigEntry = async (key: string, value: string) => {
    const { error } = await supabase
      .from("tournament_config")
      .upsert({ key, value }, { onConflict: "key" });

    if (error) throw error;
  };

  const handleTogglePredictionsLocked = async (locked: boolean) => {
    const previousValue = config.predictions_locked ?? "false";
    const nextValue = locked ? "true" : "false";

    setConfig((prev) => ({ ...prev, predictions_locked: nextValue }));
    setSaving(true);

    try {
      await saveConfigEntry("predictions_locked", nextValue);
      setSavedConfig((prev) => ({ ...prev, predictions_locked: nextValue }));
      await publishAdminUpdate(
        locked
          ? "Las predicciones han quedado bloqueadas. Ya no se pueden modificar resultados."
          : "Las predicciones se han desbloqueado manualmente."
      );
      toast({ title: locked ? "Predicciones bloqueadas" : "Predicciones desbloqueadas" });
    } catch (error) {
      setConfig((prev) => ({ ...prev, predictions_locked: previousValue }));
      toast({
        title: "Error al guardar el bloqueo",
        description: error instanceof Error ? error.message : "No se pudo actualizar la configuracion.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    const percentTotal = prizeDistributionPercentTotal(prizeDistribution);
    if (percentTotal > 100) {
      toast({
        title: "Porcentajes invalidos",
        description: "Los premios activos por porcentaje no pueden superar el 100%.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const configToSave = {
      ...config,
      prize_distribution: serializePrizeDistribution(prizeDistribution),
    };
    const changed = configChangeSummary();
    try {
      for (const [key, value] of Object.entries(configToSave)) {
        await saveConfigEntry(key, value);
      }
      if (changed.length > 0) {
        await publishAdminUpdate(`Se ha actualizado la configuracion de la porra: ${changed.join(", ")}.`);
        setSavedConfig({ ...configToSave });
        setSavedPrizeDistribution(prizeDistribution.map((item) => ({ ...item })));
      }
      toast({ title: "Configuración guardada" });
    } catch (error) {
      toast({
        title: "Error al guardar configuracion",
        description: error instanceof Error ? error.message : "No se pudo guardar la configuracion.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
  const prizePercentTotal = prizeDistributionPercentTotal(prizeDistribution);

  const updatePrize = (key: string, updates: Partial<PrizeConfig>) => {
    setPrizeDistribution((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...updates } : item))
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
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
              disabled={saving}
              onCheckedChange={(v) => void handleTogglePredictionsLocked(v)}
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

      {/* Premios */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Reparto de premios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
            Porcentajes activos: <span className="font-semibold text-ink">{prizePercentTotal}%</span>
            {prizePercentTotal > 100 && (
              <span className="ml-1 font-semibold text-red">No puede superar el 100%</span>
            )}
          </div>
          {prizeDistribution.map((prize) => (
            <div key={prize.key} className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Input
                  value={prize.label}
                  onChange={(e) => updatePrize(prize.key, { label: e.target.value })}
                  className="h-9 font-medium"
                />
                <Switch
                  checked={prize.active}
                  onCheckedChange={(active) => updatePrize(prize.key, { active })}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-ink-muted">Quien recibe premio</Label>
                  <Select
                    value={prize.recipient}
                    onValueChange={(recipient) =>
                      updatePrize(prize.key, { recipient: recipient as PrizeRecipient })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIZE_RECIPIENT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-ink-muted">Tipo</Label>
                  <Select
                    value={prize.type}
                    onValueChange={(type) => updatePrize(prize.key, { type: type as PrizeType })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje</SelectItem>
                      <SelectItem value="fixed">Importe fijo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-ink-muted">
                  {prize.type === "fixed" ? "Importe fijo" : "Porcentaje del bote restante"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step={prize.type === "fixed" ? "0.5" : "1"}
                  value={prize.value}
                  onChange={(e) =>
                    updatePrize(prize.key, { value: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSaveConfig} disabled={saving} className="w-full">
        Guardar pago y premios
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
