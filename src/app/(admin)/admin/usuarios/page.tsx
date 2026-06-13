"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { isMissingProfilesColumnError } from "@/lib/admin/profile-payments";
import { filterAdminUsers } from "@/lib/admin/user-search";
import {
  sortAdminUsers,
  type AdminUserSort,
  type AdminUserSortDirection,
  type AdminUserSortKey,
} from "@/lib/admin/user-sort";
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
  is_active: boolean;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<AdminUserSort>({ key: "created_at", direction: "desc" });
  const { toast } = useToast();
  const supabase = createClient();

  const filteredProfiles = useMemo(() => filterAdminUsers(profiles, searchQuery), [profiles, searchQuery]);
  const displayedProfiles = useMemo(
    () =>
      sortAdminUsers(
        filteredProfiles.map((profile) => {
          const completion = completionByUser.get(profile.id);
          const completed = completion
            ? completion.grupos.completed +
              completion.clasificados.completed +
              completion.cuadro.completed +
              completion.premios.completed
            : 0;
          const total = completion
            ? completion.grupos.total + completion.clasificados.total + completion.cuadro.total + completion.premios.total
            : 119;

          return {
            ...profile,
            porra_pct: Math.round((completed / total) * 100),
            last_prediction_updated_at: lastPredictionUpdateByUser.get(profile.id) ?? null,
          };
        }),
        sort
      ),
    [completionByUser, filteredProfiles, lastPredictionUpdateByUser, sort]
  );

  function toggleSort(key: AdminUserSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

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

  async function toggleField(userId: string, field: "has_paid" | "is_chat_banned" | "is_active", value: boolean) {
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
          <div className="border-b border-border p-4">
            <label htmlFor="admin-user-search" className="sr-only">
              Buscar usuarios
            </label>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input
                id="admin-user-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar por nombre, email o estado"
                className="pl-9"
              />
            </div>
            {searchQuery.trim() && (
              <p className="mt-2 text-xs text-ink-muted">
                {filteredProfiles.length} de {profiles.length} usuarios
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-ink-muted bg-surface-sunken">
                  <SortHeader label="Nombre" sortKey="display_name" sort={sort} onSort={toggleSort} className="px-4" />
                  <SortHeader label="Email" sortKey="email" sort={sort} onSort={toggleSort} />
                  <SortHeader label="Porra" sortKey="porra_pct" sort={sort} onSort={toggleSort} />
                  <SortHeader label="Ultima act." sortKey="last_prediction_updated_at" sort={sort} onSort={toggleSort} />
                  <SortHeader label="Pagado" sortKey="has_paid" sort={sort} onSort={toggleSort} align="center" />
                  <SortHeader label="Pago" sortKey="paid_at" sort={sort} onSort={toggleSort} />
                  <SortHeader label="Activo" sortKey="is_active" sort={sort} onSort={toggleSort} align="center" />
                  <SortHeader label="Ban Chat" sortKey="is_chat_banned" sort={sort} onSort={toggleSort} align="center" />
                  <SortHeader label="Admin" sortKey="is_admin" sort={sort} onSort={toggleSort} align="center" />
                  <SortHeader label="Registro" sortKey="created_at" sort={sort} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={10} className="py-8 px-4 text-center text-sm text-ink-muted">
                      Cargando usuarios...
                    </td>
                  </tr>
                )}
                {displayedProfiles.map((p) => {
                  const completion = completionByUser.get(p.id);

                  return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-surface-sunken/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-ink">{p.display_name}</td>
                    <td className="py-3 px-2 text-ink-muted text-xs">{p.email}</td>
                    <td className="py-3 px-2 min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <span className="w-9 text-right font-marcador text-sm font-bold text-ink">
                          {p.porra_pct}%
                        </span>
                        <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                          <div className="h-full rounded-full bg-red" style={{ width: `${p.porra_pct}%` }} />
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
                      {formatLastPredictionUpdate(p.last_prediction_updated_at)}
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
                        checked={p.is_active !== false}
                        onCheckedChange={(v) => toggleField(p.id, "is_active", v)}
                      />
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
                {shouldShowEmptyState(loading, displayedProfiles.length) && (
                  <tr>
                    <td colSpan={10} className="py-8 px-4 text-center text-sm text-ink-muted">
                      {searchQuery.trim() ? "No hay usuarios que coincidan con la busqueda." : "No hay usuarios registrados."}
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

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  sortKey: AdminUserSortKey;
  sort: AdminUserSort;
  onSort: (key: AdminUserSortKey) => void;
  align?: "left" | "center";
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ChevronUp : ChevronDown;
  const ariaSort = active ? ({ asc: "ascending", desc: "descending" } as Record<AdminUserSortDirection, "ascending" | "descending">)[sort.direction] : "none";

  return (
    <th className={cn("py-3 px-2 font-sans font-medium", align === "center" ? "text-center" : "text-left", className)} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md text-xs transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          align === "center" && "justify-center",
          active ? "text-ink" : "text-ink-muted"
        )}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}
