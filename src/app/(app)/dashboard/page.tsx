import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FileText, Trophy, MessageCircle, Clock } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: config } = await supabase
    .from("tournament_config")
    .select("*");

  const lockDatetime = config?.find((c) => c.key === "lock_datetime")?.value;
  const isLocked = config?.find((c) => c.key === "predictions_locked")?.value === "true";
  const bizumPhone = config?.find((c) => c.key === "bizum_phone")?.value;

  const { count: predictionsCount } = await supabase
    .from("match_predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { data: userScore } = await supabase
    .from("user_scores")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Hola, {profile?.display_name || "Jugador"}
        </h1>
        <p className="text-muted-foreground">Bienvenido a la Porra del Mundial 2026</p>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        {profile?.has_paid ? (
          <Badge variant="default">Pago confirmado</Badge>
        ) : (
          <Badge variant="destructive">Pago pendiente</Badge>
        )}
        {isLocked ? (
          <Badge variant="secondary">Predicciones bloqueadas</Badge>
        ) : (
          <Badge variant="outline">Predicciones abiertas</Badge>
        )}
      </div>

      {/* Countdown */}
      {!isLocked && lockDatetime && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Fecha límite para predicciones</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(lockDatetime).toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bizum reminder */}
      {!profile?.has_paid && bizumPhone && (
        <Card className="border-[hsl(var(--gold))]/30 bg-[hsl(var(--gold))]/5">
          <CardContent className="pt-6">
            <p className="font-medium text-[hsl(var(--gold))]">
              Para validar tu participación, envía un Bizum a {bizumPhone}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pronósticos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{predictionsCount || 0}/104</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Puntos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{userScore?.total_points || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/predicciones/grupos">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Mis Predicciones</p>
                <p className="text-xs text-muted-foreground">Rellenar pronósticos</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ranking">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-[hsl(var(--gold))]" />
              <div>
                <p className="font-medium">Ranking</p>
                <p className="text-xs text-muted-foreground">Ver clasificación</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/chat">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-blue-400" />
              <div>
                <p className="font-medium">Chat</p>
                <p className="text-xs text-muted-foreground">Hablar con el grupo</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
