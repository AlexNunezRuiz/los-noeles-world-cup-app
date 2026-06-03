import { createClient } from "@/lib/supabase/server";
import {
  calculatePrizeBreakdown,
  formatEuros,
  parsePaymentAmount,
  parsePrizeDistribution,
} from "@/lib/prizes/config";

interface ConfigRow {
  key: string;
  value: string;
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
  const prizes = calculatePrizeBreakdown({
    paidCount,
    entryFee,
    distribution: parsePrizeDistribution(config.get("prize_distribution"), entryFee),
  });
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

  return (
    <div className="space-y-5 pb-6">
      <div className="px-1">
        <h1 className="font-marcador text-3xl uppercase leading-tight text-ink">El Bote</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {paidCount} participante{paidCount !== 1 ? "s" : ""} · €{paymentAmount} de inscripcion
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
        <h2 className="px-1 font-marcador text-base uppercase text-ink-muted">Distribucion</h2>
        {prizes.items.map(({ key, label, amount, detail }) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
          >
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
          <p className="text-sm font-semibold text-ink">Inscripcion pagada</p>
          <p className="mt-0.5 text-xs text-ink-muted">Estas dentro del bote</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-surface px-4 py-4 text-center">
          <div>
            <p className="text-sm font-semibold text-ink">Todavia no has pagado?</p>
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
                <span className="font-semibold text-ink">Concepto:</span> {conceptPrefix} + tu usuario
              </p>
            </div>
          ) : (
            <p className="text-xs text-amber">
              El administrador todavia no ha publicado el IBAN.
            </p>
          )}
        </div>
      )}

      <p className="px-4 text-center text-[11px] text-ink-faint">
        El bote se actualiza automaticamente conforme se confirman los pagos.
        Los importes se redondean al euro inferior.
      </p>
    </div>
  );
}
