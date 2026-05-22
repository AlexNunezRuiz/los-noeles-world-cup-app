"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { normalizeUsername, validateUsername } from "@/lib/auth/username";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const usernameError = validateUsername(username);
    if (usernameError) {
      toast({
        title: "Usuario no válido",
        description: usernameError,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Vuelve a escribir la misma contraseña en los dos campos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const cleanUsername = normalizeUsername(username);

    // Comprobación de usuario libre (si la función del servidor está disponible).
    try {
      const { data: taken } = await supabase.rpc("email_for_username", {
        p_username: cleanUsername,
      });
      if (taken) {
        toast({
          title: "Usuario no disponible",
          description: "Ese usuario ya está cogido. Prueba con otro.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    } catch {
      /* La función aún no está disponible — el alta fallará si está repetido. */
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: displayName.trim(), username: cleanUsername },
      },
    });

    if (error) {
      const dup = /already|registered|exists|duplicate/i.test(error.message);
      toast({
        title: "Error al registrarse",
        description: dup
          ? "Ya hay una cuenta con ese correo o usuario."
          : error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Cuenta creada",
      description: "¡Bienvenido a la porra!",
    });

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle className="text-center font-marcador uppercase">
          Crear cuenta
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleRegister}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              type="text"
              placeholder="con el que entrarás"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              type="text"
              placeholder="el que verán los demás"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Repetir contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="La misma contraseña"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" variant="default" className="w-full" disabled={loading}>
            {loading ? "Creando cuenta..." : "Registrarse"}
          </Button>
          <p className="text-sm text-ink-muted text-center">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-blue hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
