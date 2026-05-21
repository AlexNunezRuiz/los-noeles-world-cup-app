"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface Profile {
  id: string;
  display_name: string;
  email: string;
  has_paid: boolean;
  is_admin: boolean;
  is_chat_banned: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function MiCuentaPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", profile.id);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil actualizado" });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!profile)
    return (
      <div className="text-center py-8 text-ink-muted font-sans text-sm">
        Cargando...
      </div>
    );

  const initials = getInitials(profile.display_name || profile.email || "?");

  return (
    <div className="space-y-6 max-w-lg">
      {/* Page heading */}
      <h1 className="font-marcador uppercase text-3xl tracking-wide text-ink">
        Mi cuenta
      </h1>

      {/* Profile card */}
      <Card className="bg-surface border border-border rounded-xl overflow-hidden">
        <CardContent className="pt-6 space-y-5">
          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-ink text-cream flex items-center justify-center font-marcador font-bold text-xl uppercase shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-marcador font-bold text-lg uppercase tracking-wide text-ink truncate">
                {profile.display_name || "—"}
              </p>
              <p className="text-sm font-sans text-ink-muted truncate">
                {profile.email}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Display name field */}
          <div className="space-y-2">
            <Label htmlFor="display-name" className="text-ink-muted font-sans text-xs uppercase tracking-wider">
              Nombre visible
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre en la porra"
            />
          </div>

          <Button onClick={handleSave} disabled={loading} size="sm">
            {loading ? "Guardando..." : "Guardar nombre"}
          </Button>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Payment status row */}
          <div className="flex items-center justify-between">
            <span className="font-sans text-sm text-ink-muted">Estado de pago</span>
            {profile.has_paid ? (
              <Badge variant="success">Pago confirmado</Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-amber/15 text-amber border border-amber/30"
              >
                Pago pendiente
              </Badge>
            )}
          </div>

          {/* Chat ban row (only when banned) */}
          {profile.is_chat_banned && (
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm text-ink-muted">Chat</span>
              <Badge variant="default">Baneado</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button variant="outline" onClick={handleSignOut} className="w-full">
        Cerrar sesión
      </Button>
    </div>
  );
}
