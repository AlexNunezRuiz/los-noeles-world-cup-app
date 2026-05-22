import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Swords,
  BarChart2,
  Grid2x2,
  Trophy,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

// ── Row shapes ─────────────────────────────────────────────────────────────
interface TournamentConfigRow {
  key: string;
  value: string;
}

interface MatchRow {
  id: number;
  stage: string;
}

interface MatchPredictionRow {
  match_id: number;
}

interface GroupStandingRow {
  group_letter: string;
}

interface AwardPredictionRow {
  id: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function pct(done: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatLockDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function motivationText(overallPct: number): string {
  if (overallPct === 0) return "¡Empieza a rellenar tu porra!";
  if (overallPct < 25) return "Buen comienzo, sigue así";
  if (overallPct < 50) return "Ya vas por el primer cuarto";
  if (overallPct < 75) return "Vas muy bien, casi la tienes";
  if (overallPct < 100) return "¡Casi lista! Un último empujón";
  return "¡Porra completa! Eres un crack";
}

// ── Page ───────────────────────────────────────────────────────────────────
export default async function PorraPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Consultas independientes en paralelo — solo auth.getUser() debe ir antes.
  // Antes eran 6 round-trips en serie; ahora es 1× la latencia en vez de 6×.
  const [
    { data: profile },
    { data: configRows },
    { data: allMatches },
    { data: userPredictions },
    { data: standingRows },
    { data: awardRows },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("tournament_config").select("*"),
    supabase.from("matches").select("id, stage"),
    supabase
      .from("match_predictions")
      .select("match_id")
      .eq("user_id", user!.id),
    supabase
      .from("predicted_group_standings")
      .select("group_letter")
      .eq("user_id", user!.id),
    supabase.from("award_predictions").select("id").eq("user_id", user!.id),
  ]);

  // Tournament config
  const config = (configRows ?? []) as TournamentConfigRow[];
  const lockDatetime = config.find((c) => c.key === "lock_datetime")?.value;
  const bizumPhone = config.find((c) => c.key === "bizum_phone")?.value;

  // All matches (to split by stage)
  const matches = (allMatches ?? []) as MatchRow[];
  const groupMatchIds = matches
    .filter((m) => m.stage === "group")
    .map((m) => m.id);
  const knockoutMatchIds = matches
    .filter((m) => m.stage !== "group")
    .map((m) => m.id);

  // User's match predictions
  const predictions = (userPredictions ?? []) as MatchPredictionRow[];
  const predictedIds = new Set(predictions.map((p) => p.match_id));

  const gruposDone = groupMatchIds.filter((id) => predictedIds.has(id)).length;
  const eliminatoriasDone = knockoutMatchIds.filter((id) =>
    predictedIds.has(id)
  ).length;

  // Clasificados: groups where user has 4 rows in predicted_group_standings
  const standings = (standingRows ?? []) as GroupStandingRow[];
  const groupCounts = standings.reduce<Record<string, number>>((acc, row) => {
    acc[row.group_letter] = (acc[row.group_letter] ?? 0) + 1;
    return acc;
  }, {});
  const clasificadosDone = Object.values(groupCounts).filter(
    (n) => n >= 4
  ).length;

  // Award predictions
  const premiosDone = ((awardRows ?? []) as AwardPredictionRow[]).length;

  // Overall progress — average of the 4 phase percentages
  const gruposPct = pct(gruposDone, 72);
  const clasificadosPct = pct(clasificadosDone, 12);
  const eliminatoriasPct = pct(eliminatoriasDone, 32);
  const premiosPct = pct(premiosDone, 3);
  const overallPct = Math.round(
    (gruposPct + clasificadosPct + eliminatoriasPct + premiosPct) / 4
  );

  // First incomplete phase for the CTA button
  const phases = [
    { href: "/predicciones/grupos", pct: gruposPct },
    { href: "/predicciones/clasificados", pct: clasificadosPct },
    { href: "/predicciones/eliminatorias", pct: eliminatoriasPct },
    { href: "/predicciones/premios", pct: premiosPct },
  ];
  const firstIncomplete =
    phases.find((p) => p.pct < 100)?.href ?? "/predicciones/grupos";

  // Days remaining
  const daysLeft = lockDatetime ? daysUntil(lockDatetime) : null;
  const lockLabel = lockDatetime ? formatLockDate(lockDatetime) : null;

  const displayName = profile?.display_name ?? "Jugador";
  const hasPaid: boolean = profile?.has_paid ?? false;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pt-1">
      {/* Greeting */}
      <div>
        <h1 className="font-marcador font-bold text-[34px] uppercase leading-none text-ink">
          Mi Porra
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Hola, <span className="font-semibold text-ink">{displayName}</span>.
          Aquí tienes todo tu progreso de un vistazo.
        </p>
      </div>

      {/* Global progress card */}
      <div className="rounded-[14px] bg-surface border border-border px-4 py-3 flex items-center gap-4 shadow-[0_5px_14px_-11px_rgba(26,26,23,0.5)]">
        <span className="font-marcador font-bold text-[46px] leading-none text-red">
          {overallPct}%
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink">
            {motivationText(overallPct)}
          </p>
          {lockLabel && daysLeft !== null && (
            <p className="text-[11px] text-ink-muted mt-0.5">
              Cierra el {lockLabel} &middot; faltan{" "}
              {daysLeft === 1 ? "1 día" : `${daysLeft} días`}
            </p>
          )}
          {/* progress bar */}
          <div className="h-1.5 bg-surface-sunken rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-red rounded-full transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Phase cards */}
      <div className="flex flex-col gap-2">
        {/* Grupos */}
        <Link href="/predicciones/grupos">
          <div className="bg-surface border border-border rounded-[13px] px-3 py-2.5 flex items-center gap-3 hover:border-red/40 transition-colors">
            <span className="w-10 h-10 rounded-[9px] bg-red/10 flex items-center justify-center flex-shrink-0">
              <Grid2x2 className="w-5 h-5 text-red" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-marcador font-bold text-base uppercase text-ink leading-none">
                Grupos
              </p>
              <p className="text-[10.5px] text-ink-muted mt-0.5">
                {gruposDone} / 72 partidos
              </p>
              <div className="h-1 bg-surface-sunken rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-red rounded-full"
                  style={{ width: `${gruposPct}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-marcador font-bold text-sm text-ink-faint">
                {gruposPct === 100 ? (
                  <span className="text-green">✓</span>
                ) : (
                  `${gruposPct}%`
                )}
              </span>
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </div>
          </div>
        </Link>

        {/* Clasificados */}
        <Link href="/predicciones/clasificados">
          <div className="bg-surface border border-border rounded-[13px] px-3 py-2.5 flex items-center gap-3 hover:border-blue/40 transition-colors">
            <span className="w-10 h-10 rounded-[9px] bg-blue/10 flex items-center justify-center flex-shrink-0">
              <BarChart2 className="w-5 h-5 text-blue" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-marcador font-bold text-base uppercase text-ink leading-none">
                Clasificados
              </p>
              <p className="text-[10.5px] text-ink-muted mt-0.5">
                {clasificadosDone} / 12 grupos ordenados
              </p>
              <div className="h-1 bg-surface-sunken rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue rounded-full"
                  style={{ width: `${clasificadosPct}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-marcador font-bold text-sm text-ink-faint">
                {clasificadosPct === 100 ? (
                  <span className="text-green">✓</span>
                ) : (
                  `${clasificadosPct}%`
                )}
              </span>
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </div>
          </div>
        </Link>

        {/* Eliminatorias */}
        <Link href="/predicciones/eliminatorias">
          <div className="bg-surface border border-border rounded-[13px] px-3 py-2.5 flex items-center gap-3 hover:border-green/40 transition-colors">
            <span className="w-10 h-10 rounded-[9px] bg-green/10 flex items-center justify-center flex-shrink-0">
              <Swords className="w-5 h-5 text-green" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-marcador font-bold text-base uppercase text-ink leading-none">
                Eliminatorias
              </p>
              <p className="text-[10.5px] text-ink-muted mt-0.5">
                {eliminatoriasDone} / 32 cruces
              </p>
              <div className="h-1 bg-surface-sunken rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-green rounded-full"
                  style={{ width: `${eliminatoriasPct}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-marcador font-bold text-sm text-ink-faint">
                {eliminatoriasPct === 100 ? (
                  <span className="text-green">✓</span>
                ) : (
                  `${eliminatoriasPct}%`
                )}
              </span>
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </div>
          </div>
        </Link>

        {/* Premios */}
        <Link href="/predicciones/premios">
          <div className="bg-surface border border-border rounded-[13px] px-3 py-2.5 flex items-center gap-3 hover:border-gold/40 transition-colors">
            <span className="w-10 h-10 rounded-[9px] bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-gold" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-marcador font-bold text-base uppercase text-ink leading-none">
                Premios
              </p>
              <p className="text-[10.5px] text-ink-muted mt-0.5">
                Bota &middot; Balón &middot; Guante — {premiosDone} / 3
              </p>
              <div className="h-1 bg-surface-sunken rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full"
                  style={{ width: `${premiosPct}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-marcador font-bold text-sm text-ink-faint">
                {premiosPct === 100 ? (
                  <span className="text-green">✓</span>
                ) : (
                  `${premiosPct}%`
                )}
              </span>
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </div>
          </div>
        </Link>
      </div>

      {/* CTA button */}
      <Button asChild size="lg" className="w-full">
        <Link href={firstIncomplete}>Seguir rellenando</Link>
      </Button>

      {/* Bizum reminder */}
      {!hasPaid && bizumPhone && (
        <div className="border border-gold/30 bg-gold/5 rounded-[13px] px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gold font-medium leading-snug">
            Para validar tu participación, envía un Bizum a{" "}
            <span className="font-bold">{bizumPhone}</span>.
          </p>
        </div>
      )}
    </div>
  );
}
