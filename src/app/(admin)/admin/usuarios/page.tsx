"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { isMissingProfilesColumnError } from "@/lib/admin/profile-payments";

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

export default function AdminUsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles(data || []);
  }

  async function toggleField(userId: string, field: "has_paid" | "is_chat_banned", value: boolean) {
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
                  <th className="text-center py-3 px-2 font-sans font-medium">Pagado</th>
                  <th className="text-left py-3 px-2 font-sans font-medium">Pago</th>
                  <th className="text-center py-3 px-2 font-sans font-medium">Ban Chat</th>
                  <th className="text-center py-3 px-2 font-sans font-medium">Admin</th>
                  <th className="text-left py-3 px-2 font-sans font-medium">Registro</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-surface-sunken/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-ink">{p.display_name}</td>
                    <td className="py-3 px-2 text-ink-muted text-xs">{p.email}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
