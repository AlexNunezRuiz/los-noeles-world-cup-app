"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { isMissingProfilesColumnError } from "@/lib/admin/profile-payments";
import { getPorraCompletion, type PorraCompletion } from "@/lib/predictions/completion";
import { formatLastPredictionUpdate } from "@/lib/predictions/last-update";
import { shouldShowEmptyState } from "@/lib/ui/loading-state";
import { assertNotificationInsertSucceeded } from "@/lib/notifications/internal";

interface Profile {
  id: string;
  display_name: string;
  email: string;
  has_paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_note: string | null;
  is_admin: boolean;
  is_chat_banned: boolean;
  created_at: string;
}

interface CompletionStatusRow {
  user_id: string;
  group_prediction_count: number;
  group_standing_rows: number;
  knockout_prediction_count: number;
  award_prediction_count: number;
  last_prediction_updated_at: string | null;
}

export default function AdminUsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionByUser, setCompletionByUser] = useState<Map<string, PorraCompletion>>(new Map());
  const [lastPredictionUpdateByUser, setLastPredictionUpdateByUser] = useState<Map<string, string | null>>(new Map());
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    const [{ data }, { data: completionRows }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.rpc("get_porra_completion_status"),
    ]);
    setProfiles(data || []);
    setCompletionByUser(
      new Map(
        ((completionRows ?? []) as CompletionStatusRow[]).map((row) => [
          row.user_id,
          getPorraCompletion({
            groupPredictionCount: row.group_prediction_count,
            groupStandingRows: row.group_standing_rows,
            knockoutPredictionCount: row.knockout_prediction_count,
            awardPredictionCount: row.award_prediction_count,
          }),
        ])
      )
    );
    setLastPredictionUpdateByUser(
      new Map(
        ((completionRows ?? []) as CompletionStatusRow[]).map((row) => [
          row.user_id,
          row.last_prediction_updated_at,
        ])
      )
    );
    setLoading(false);
  }

  async function toggleField(userId: string, field: "has_paid" | "is_chat_banned", value: boolean) {
    const targetProfile = profiles.find((profile) => profile.id === userId);
    const patch =
      field === "has_paid"
        ? {
            has_paid: value,
            paid_at: value ? new Date().toISOString() : null,
            payment_method: value ? "transfer" : null,
            payment_reference: null,
          }
        : { [field]: value };
    let extendedPaymentSaved = field !== "has_paid";
    let { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", userId);

    if (field === "has_paid" && error && isMissingProfilesColumnError(error)) {
      extendedPaymentSaved = false;
      const fallback = await supabase.from("profiles").update({ has_paid: value }).eq("id", userId);
      error = fallback.error;
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === userId
            ? {
                ...p,
                [field]: value,
                ...(field === "has_paid" && extendedPaymentSaved
                  ? {
                      paid_at: value ? new Date().toISOString() : null,
                      payment_method: value ? "transfer" : null,
                      payment_reference: null,
                    }
                  : {}),
              }
            : p
        )
      );
      if (field === "has_paid") {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("No se pudo identificar al administrador.");
          assertNotificationInsertSucceeded(
            await supabase.from("notifications").insert({
              user_id: userId,
              actor_user_id: user.id,
              type: "payment_update",
              title: value ? "Pago confirmado" : "Pago pendiente",
              body: value
                ? "Tu pago de la porra ha sido marcado como recibido."
                : "Tu pago de la porra ha vuelto a marcarse como pendiente.",
              link: "/mi-cuenta",
            }),
            `No se pudo notificar el cambio de pago de ${targetProfile?.display_name ?? "usuario"}`
          );
        } catch (notificationError) {
          toast({
            title: "Usuario actualizado, pero fallo la notificacion",
            description:
              notificationError instanceof Error
                ? notificationError.message
                : "No se pudo crear la notificacion de pago.",
            variant: "destructive",
          });
        }
      }
      toast({ title: "Actualizado" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-marcador font-bold uppercase tracking-wide text-2xl text-ink">Usuarios</h1>
        <div className="flex gap-2">
          <Badge variant="outline">
            <span className="font-marcador">{profiles.length}</span>&nbsp;registrados
          </Badge>
          <Badge variant="outline">
            <span className="font-marcador">{profiles.filter((p) => p.has_paid).length}</span>&nbsp;pagados
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-ink-muted bg-surface-sunken">
                  <th className="text-left py-3 px-4 font-sans font-medium">Nombre</th>
                  <th className="text-left py-3 px-2 font-sans font-medium">Email</th>
                  <th className="text-left py-3 px-2 font-sans font-medium">Porra</th>
                  <th className="text-left py-3 px-2 font-sans font-medium">Ultima act.</th>
                  <th className="text-center py-3 px-2 font-sans font-medium">Pagado</th>
                  <th className="text-left py-3 px-2 font-sans font-medium">Pago</th>
                  <th className="text-center py-3 px-2 font-sans font-medium">Ban Chat</th>
                  <th className="text-center py-3 px-2 font-sans font-medium">Admin</th>
                  <th className="text-left py-3 px-2 font-sans font-medium">Registro</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="py-8 px-4 text-center text-sm text-ink-muted">
                      Cargando usuarios...
                    </td>
                  </tr>
                )}
                {profiles.map((p) => {
                  const completion = completionByUser.get(p.id);
                  const completed = completion
                    ? completion.grupos.completed +
                      completion.clasificados.completed +
                      completion.cuadro.completed +
                      completion.premios.completed
                    : 0;
                  const total = completion
                    ? completion.grupos.total +
                      completion.clasificados.total +
                      completion.cuadro.total +
                      completion.premios.total
                    : 119;
                  const porraPct = Math.round((completed / total) * 100);

                  return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-surface-sunken/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-ink">{p.display_name}</td>
                    <td className="py-3 px-2 text-ink-muted text-xs">{p.email}</td>
                    <td className="py-3 px-2 min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <span className="w-9 text-right font-marcador text-sm font-bold text-ink">
                          {porraPct}%
                        </span>
                        <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                          <div className="h-full rounded-full bg-red" style={{ width: `${porraPct}%` }} />
                        </div>
                      </div>
                      {completion && (
                        <p className="mt-1 text-[10px] text-ink-muted">
                          G {completion.grupos.label} · C {completion.clasificados.label} · Q{" "}
                          {completion.cuadro.label} · P {completion.premios.label}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-2 text-ink-faint text-xs font-marcador whitespace-nowrap">
                      {formatLastPredictionUpdate(lastPredictionUpdateByUser.get(p.id))}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Switch
                        checked={p.has_paid}
                        onCheckedChange={(v) => toggleField(p.id, "has_paid", v)}
                      />
                    </td>
                    <td className="py-3 px-2 text-ink-faint text-xs">
                      {p.paid_at
                        ? `${new Date(p.paid_at).toLocaleString("es-ES")} · ${
                            p.payment_method === "transfer" ? "Transferencia" : p.payment_method ?? "Pago"
                          }`
                        : p.has_paid
                        ? "Confirmado"
                        : "Pendiente"}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Switch
                        checked={p.is_chat_banned}
                        onCheckedChange={(v) => toggleField(p.id, "is_chat_banned", v)}
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      {p.is_admin && <Badge variant="default">Admin</Badge>}
                    </td>
                    <td className="py-3 px-2 text-ink-faint text-xs font-marcador">
                      {new Date(p.created_at).toLocaleDateString("es-ES")}
                    </td>
                  </tr>
                );
                })}
                {shouldShowEmptyState(loading, profiles.length) && (
                  <tr>
                    <td colSpan={9} className="py-8 px-4 text-center text-sm text-ink-muted">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
