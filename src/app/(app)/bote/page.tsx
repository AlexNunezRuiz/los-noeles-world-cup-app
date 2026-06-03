import { createClient } from "@/lib/supabase/server";

const DEFAULT_ENTRY_FEE = 5;

interface ConfigRow {
  key: string;
  value: string;
}

function parsePaymentAmount(value?: string | null) {
  const amount = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? amount : DEFAULT_ENTRY_FEE;
}

function formatEuros(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(".", ",");
}

function calcPrizes(paidCount: number, entryFee: number) {
  const total = paidCount * entryFee;
  const remaining = Math.max(0, total - entryFee);
  return {
    total,
    lastPlace: entryFee,
    first: Math.floor(remaining * 0.6),
    second: Math.floor(remaining * 0.25),
    third: Math.floor(remaining * 0.1),
    groupChamp: Math.floor(remaining * 0.05),
  };
}

export default async function BotePage() {
  const supabase = createClient();

  const [{ count }, { data: auth }, { data: configRows }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("has_paid", true),
    supabase.auth.getUser(),
    supabase.from("tournament_config").select("key, value"),
  ]);

  const paidCount = count ?? 0;
  const config = new Map(((configRows ?? []) as ConfigRow[]).map((row) => [row.key, row.value]));
  const entryFee = parsePaymentAmount(config.get("payment_amount"));
  const paymentAmount = formatEuros(entryFee);
  const prizes = calcPrizes(paidCount, entryFee);
  const bankIban = config.get("bank_iban");
  const bankHolder = config.get("bank_account_holder");
  const conceptPrefix = config.get("bank_concept_prefix") ?? "PORRA";

  let hasPaid = false;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("has_paid")
      .eq("id", auth.user.id)
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
        <h1 className="font-marcador text-3xl uppercase leading-tight text-ink">El Bote</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {paidCount} participante{paidCount !== 1 ? "s" : ""} · €{paymentAmount} de inscripción
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Bote total
        </p>
        <p className="font-marcador text-7xl leading-none text-ink">€{formatEuros(prizes.total)}</p>
        {paidCount === 0 && (
          <p className="mt-3 text-xs text-ink-faint">
            Crece €{paymentAmount} por cada participante que pague
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="px-1 font-marcador text-base uppercase text-ink-muted">Distribución</h2>
        {breakdown.map(({ label, amount, detail, emoji }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
          >
            <span className="w-7 flex-shrink-0 text-center text-xl">{emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-ink">{label}</p>
              <p className="text-xs text-ink-muted">{detail}</p>
            </div>
            <span className="flex-shrink-0 font-marcador text-2xl text-ink">€{formatEuros(amount)}</span>
          </div>
        ))}
      </div>

      {hasPaid ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-4 text-center">
          <p className="text-sm font-semibold text-ink">Inscripción pagada</p>
          <p className="mt-0.5 text-xs text-ink-muted">Estás dentro del bote</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-surface px-4 py-4 text-center">
          <div>
            <p className="text-sm font-semibold text-ink">¿Todavía no has pagado?</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Paga €{paymentAmount} por transferencia para entrar al bote.
            </p>
          </div>
          {bankIban ? (
            <div className="rounded-lg bg-surface-sunken px-3 py-2 text-left text-xs text-ink-muted">
              <p>
                <span className="font-semibold text-ink">IBAN:</span> {bankIban}
              </p>
              {bankHolder && (
                <p>
                  <span className="font-semibold text-ink">Titular:</span> {bankHolder}
                </p>
              )}
              <p>
                <span className="font-semibold text-ink">Concepto:</span> {conceptPrefix} + tu nombre de usuario
              </p>
            </div>
          ) : (
            <p className="text-xs text-amber">
              El administrador todavía no ha publicado el IBAN.
            </p>
          )}
        </div>
      )}

      <p className="px-4 text-center text-[11px] text-ink-faint">
        El bote se actualiza automáticamente conforme se confirman los pagos.
        Los importes se redondean al euro inferior.
      </p>
    </div>
  );
}
