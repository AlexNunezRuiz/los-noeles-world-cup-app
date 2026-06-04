import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  PRIZE_RECIPIENT_LABELS,
  formatEuros,
  parsePaymentAmount,
  parsePrizeDistribution,
} from "@/lib/prizes/config";
import {
  SCORING_CATEGORY_LABELS,
  SCORING_CATEGORY_ORDER,
  compareScoringRules,
  getScoringRuleLabel,
  type ScoringCategory,
} from "@/lib/scoring/rules";

interface ScoringRule {
  rule_key: string;
  points: number;
  description: string;
  category: string;
}

interface TournamentConfig {
  key: string;
  value: string;
}

export default async function NormasPage() {
  const supabase = createClient();

  const [{ data: rules }, { data: config }] = await Promise.all([
    supabase.from("scoring_rules").select("rule_key, points, description, category").order("id"),
    supabase.from("tournament_config").select("key, value"),
  ]);

  const configMap = new Map(((config ?? []) as TournamentConfig[]).map((c) => [c.key, c.value]));
  const lockDatetime = configMap.get("lock_datetime");
  const entryFee = parsePaymentAmount(configMap.get("payment_amount"));
  const paymentAmount = formatEuros(entryFee);
  const bankIban = configMap.get("bank_iban");
  const bankHolder = configMap.get("bank_account_holder");
  const conceptPrefix = configMap.get("bank_concept_prefix") ?? "PORRA";
  const prizes = parsePrizeDistribution(configMap.get("prize_distribution"), entryFee);

  const lockLabel = lockDatetime
    ? new Date(lockDatetime).toLocaleString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Madrid",
      })
    : "el primer partido del torneo";

  const byCategory = new Map<string, ScoringRule[]>();
  for (const rule of [...((rules ?? []) as ScoringRule[])].sort(compareScoringRules)) {
    const cat = rule.category ?? "other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(rule);
  }

  const orderedCategories = [
    ...SCORING_CATEGORY_ORDER.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !SCORING_CATEGORY_ORDER.includes(c as ScoringCategory)),
  ];

  const sections = [
    { num: "01", title: "Participacion", color: "text-red" },
    { num: "02", title: "Predicciones", color: "text-blue" },
    { num: "03", title: "Puntuacion", color: "text-gold" },
    { num: "04", title: "Premios", color: "text-green" },
    { num: "05", title: "App", color: "text-ink-muted" },
  ];

  return (
    <div className="space-y-1 pb-8">
      <div className="px-1 pb-4 pt-1">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink-muted">Mundial &apos;26</p>
        <h1 className="font-marcador text-5xl uppercase leading-none text-ink">Normas</h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {sections.map((s, i) => (
          <a
            key={s.num}
            href={`#sec-${s.num}`}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""} transition-colors hover:bg-surface-sunken`}
          >
            <span className={`w-6 font-marcador text-sm ${s.color}`}>{s.num}</span>
            <span className="font-marcador text-sm uppercase tracking-wide text-ink">{s.title}</span>
          </a>
        ))}
      </div>

      <div id="sec-01" className="space-y-3 pt-6">
        <SectionHeader num="01" title="Participacion" color="text-red" />
        <RuleCard>
          <RuleRow label="Cuota de inscripcion" value={`€${paymentAmount}`} highlight />
          <RuleRow label="Fecha limite de pago" value={lockLabel} />
          <RuleRow label="Metodo de pago" value="Transferencia bancaria" />
          {bankIban && <RuleRow label="IBAN" value={bankIban} />}
          {bankHolder && <RuleRow label="Titular" value={bankHolder} />}
          <RuleRow label="Concepto" value={`${conceptPrefix} + tu usuario`} />
          <RuleRow label="Solo participan en el bote" value="los usuarios que hayan pagado antes del cierre" />
        </RuleCard>
        <InfoBox color="red">
          El pago debe realizarse antes del cierre. Quien no haya pagado no contara en la clasificacion ni optara a premios.
        </InfoBox>
      </div>

      <div id="sec-02" className="space-y-3 pt-6">
        <SectionHeader num="02" title="Predicciones" color="text-blue" />
        <RuleCard>
          <RuleRow label="Cierre de predicciones" value={lockLabel} highlight />
          <RuleRow label="Partidos de grupos" value="Predice el marcador exacto de cada partido" />
          <RuleRow label="Clasificacion de grupos" value="Predice el orden final de los equipos de cada grupo" />
          <RuleRow label="Eliminatorias" value="Predice el marcador exacto en 90 minutos" />
          <RuleRow label="Premios individuales" value="Bota de Oro, Balon de Oro y Guante de Oro" />
        </RuleCard>
        <InfoBox color="blue">
          En eliminatorias los penaltis solo sirven para saber quien avanza. La puntuacion del resultado usa el marcador en 90 minutos.
        </InfoBox>
      </div>

      <div id="sec-03" className="space-y-3 pt-6">
        <SectionHeader num="03" title="Puntuacion" color="text-gold" />
        {orderedCategories.map((cat) => {
          const catRules = byCategory.get(cat) ?? [];
          return (
            <div key={cat} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border bg-surface-sunken px-4 py-2.5">
                <p className="font-marcador text-xs uppercase tracking-wider text-ink-muted">
                  {SCORING_CATEGORY_LABELS[cat as ScoringCategory] ?? cat}
                </p>
              </div>
              {catRules.map((rule, i) => (
                <div
                  key={rule.rule_key}
                  className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <span className="mr-4 flex-1 text-sm text-ink">
                    {getScoringRuleLabel(rule.rule_key, rule.description)}
                  </span>
                  <span className="flex-shrink-0 font-marcador text-lg text-gold">
                    +{rule.points} pts
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div id="sec-04" className="space-y-3 pt-6">
        <SectionHeader num="04" title="Premios" color="text-green" />
        <RuleCard>
          <RuleRow label="Todo lo recaudado va al bote" value="Sin comision de la plataforma" />
          {prizes.map((prize, index) => (
            <RuleRow
              key={prize.key}
              label={prize.label}
              value={
                prize.type === "fixed"
                  ? `€${formatEuros(prize.value)} fijo - ${PRIZE_RECIPIENT_LABELS[prize.recipient]}`
                  : `${prize.value}% del bote restante - ${PRIZE_RECIPIENT_LABELS[prize.recipient]}`
              }
              highlight={index === 0}
            />
          ))}
        </RuleCard>
        <InfoBox color="green">
          Los importes fijos se descuentan primero del bote. El resto se reparte con los porcentajes configurados por el administrador.
          Consulta el bote en tiempo real en{" "}
          <Link href="/bote" className="font-semibold underline">la pagina del Bote</Link>.
        </InfoBox>
      </div>

      <div id="sec-05" className="space-y-3 pt-6">
        <SectionHeader num="05" title="App" color="text-ink-muted" />
        <RuleCard>
          <RuleRow label="Instalar como app" value="Abre el menu del navegador y elige Anadir a pantalla de inicio" highlight />
          <RuleRow label="Notificaciones actuales" value="Avisos dentro de la app y mensajes en el chat" />
          <RuleRow label="Push del movil" value="Pendiente de activar suscripciones Web Push" />
        </RuleCard>
        <InfoBox color="blue">
          La app ya funciona como PWA. Para enviar notificaciones push aunque no este abierta hace falta pedir permiso al usuario,
          guardar su suscripcion y enviar Web Push desde servidor.
        </InfoBox>
      </div>

      <p className="px-4 pt-6 text-center text-[11px] text-ink-faint">
        Las normas pueden actualizarse antes del inicio del torneo. Cualquier duda, pregunta en el chat.
      </p>
    </div>
  );
}

function SectionHeader({ num, title, color }: { num: string; title: string; color: string }) {
  return (
    <div className="flex items-baseline gap-3 px-1">
      <span className={`font-marcador text-sm ${color}`}>{num}</span>
      <h2 className="font-marcador text-2xl uppercase leading-none text-ink">{title}</h2>
    </div>
  );
}

function RuleCard({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-border bg-surface">{children}</div>;
}

function RuleRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-0">
      <span className="max-w-[45%] flex-shrink-0 text-sm text-ink-muted">{label}</span>
      <span className={`text-right text-sm ${highlight ? "font-semibold text-ink" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

function InfoBox({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "red" | "blue" | "gold" | "green";
}) {
  const styles = {
    red: "border-red/30 bg-red/5 text-red",
    blue: "border-blue/30 bg-blue/5 text-blue",
    gold: "border-amber/30 bg-amber/5 text-amber",
    green: "border-green/30 bg-green/5 text-green",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles[color]}`}>
      {children}
    </div>
  );
}
