import { createClient } from "@/lib/supabase/server";

const ENTRY_FEE = 5;
const LAST_PLACE_PRIZE = 5;

function calcPrizes(paidCount: number) {
  const total = paidCount * ENTRY_FEE;
  const remaining = Math.max(0, total - LAST_PLACE_PRIZE);
  return {
    total,
    lastPlace: LAST_PLACE_PRIZE,
    first: Math.floor(remaining * 0.60),
    second: Math.floor(remaining * 0.25),
    third: Math.floor(remaining * 0.10),
    groupChamp: Math.floor(remaining * 0.05),
  };
}

export default async function BotePage() {
  const supabase = createClient();

  const [{ count }, { data: { user } }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("has_paid", true),
    supabase.auth.getUser(),
  ]);

  const paidCount = count ?? 0;
  const prizes = calcPrizes(paidCount);

  let hasPaid = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("has_paid")
      .eq("id", user.id)
      .single();
    hasPaid = profile?.has_paid ?? false;
  }

  const breakdown = [
    { label: "1º Clasificado", amount: prizes.first, detail: "60% del bote", emoji: "🥇" },
    { label: "2º Clasificado", amount: prizes.second, detail: "25% del bote", emoji: "🥈" },
    { label: "3º Clasificado", amount: prizes.third, detail: "10% del bote", emoji: "🥉" },
    { label: "Campeón de grupos", amount: prizes.groupChamp, detail: "5% del bote", emoji: "⭐" },
    { label: "Farolillo rojo", amount: prizes.lastPlace, detail: "Recupera la entrada", emoji: "🔴" },
  ];

  return (
    <div className="space-y-5 pb-6">
      <div className="px-1">
        <h1 className="font-marcador text-3xl uppercase text-ink leading-tight">El Bote</h1>
        <p className="text-sm text-ink-muted mt-1">
          {paidCount} participante{paidCount !== 1 ? "s" : ""} · €{ENTRY_FEE} de inscripción
        </p>
      </div>

      {/* Total */}
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
          Bote total
        </p>
        <p className="font-marcador text-7xl text-ink leading-none">€{prizes.total}</p>
        {paidCount === 0 && (
          <p className="text-xs text-ink-faint mt-3">
            Crece €5 por cada participante que pague
          </p>
        )}
      </div>

      {/* Prize breakdown */}
      <div className="space-y-2">
        <h2 className="font-marcador text-base uppercase text-ink-muted px-1">Distribución</h2>
        {breakdown.map(({ label, amount, detail, emoji }) => (
          <div
            key={label}
            className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3"
          >
            <span className="text-xl w-7 text-center flex-shrink-0">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink leading-tight">{label}</p>
              <p className="text-xs text-ink-muted">{detail}</p>
            </div>
            <span className="font-marcador text-2xl text-ink flex-shrink-0">€{amount}</span>
          </div>
        ))}
      </div>

      {/* Payment status */}
      {hasPaid ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-4 text-center">
          <p className="text-sm font-semibold text-ink">Inscripción pagada</p>
          <p className="text-xs text-ink-muted mt-0.5">Estás dentro del bote</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface px-4 py-4 text-center space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink">¿Todavía no has pagado?</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Paga €{ENTRY_FEE} para entrar al bote. Link de pago disponible próximamente.
            </p>
          </div>
        </div>
      )}

      {/* Rules note */}
      <p className="text-[11px] text-ink-faint text-center px-4">
        El bote se actualiza automáticamente conforme se confirman los pagos.
        Los importes se redondean al euro inferior.
      </p>
    </div>
  );
}
