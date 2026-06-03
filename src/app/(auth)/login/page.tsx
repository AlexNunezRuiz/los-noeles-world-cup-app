"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { usernameToEmail } from "@/lib/auth/username";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Resuelve el correo de acceso: si lo escrito tiene "@" es un correo;
    // si no, es un usuario y se busca su correo en el servidor.
    const id = identifier.trim().toLowerCase();
    let email = id;
    if (!id.includes("@")) {
      let resolved: string | null = null;
      try {
        const { data } = await supabase.rpc("email_for_username", {
          p_username: id,
        });
        resolved = (data as string | null) ?? null;
      } catch {
        resolved = null;
      }
      // Reserva (modo mock o función no disponible): correo sintético.
      email = resolved ?? usernameToEmail(id);
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        title: "Error al iniciar sesión",
        description: "Usuario/correo o contraseña incorrectos.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle className="text-center font-marcador uppercase">
          Iniciar sesión
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Usuario o correo</Label>
            <Input
              id="username"
              type="text"
              placeholder="tu usuario o correo"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" variant="default" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-sm text-ink-muted text-center">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-blue hover:underline">
              Regístrate
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
