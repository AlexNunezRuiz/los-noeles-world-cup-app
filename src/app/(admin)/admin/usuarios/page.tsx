"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface Profile {
  id: string;
  display_name: string;
  email: string;
  has_paid: boolean;
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
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, [field]: value } : p))
      );
      toast({ title: "Actualizado" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Badge variant="outline">{profiles.length} registrados</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-3 px-4">Nombre</th>
                  <th className="text-left py-3 px-2">Email</th>
                  <th className="text-center py-3 px-2">Pagado</th>
                  <th className="text-center py-3 px-2">Ban Chat</th>
                  <th className="text-center py-3 px-2">Admin</th>
                  <th className="text-left py-3 px-2">Registro</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">{p.display_name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{p.email}</td>
                    <td className="py-3 px-2 text-center">
                      <Switch
                        checked={p.has_paid}
                        onCheckedChange={(v) => toggleField(p.id, "has_paid", v)}
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
                    <td className="py-3 px-2 text-muted-foreground text-xs">
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
