import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const DEFAULT_ENTRY_FEE = 5;

function formatPaymentAmount(value?: string | null) {
  const amount = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return String(DEFAULT_ENTRY_FEE);
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(".", ",");
}

const CATEGORY_LABELS: Record<string, string> = {
  group_stage: "Fase de grupos",
  knockout_exact: "Eliminatorias — resultado exacto",
  qualification: "Clasificación por ronda",
  awards: "Premios individuales",
};

const CATEGORY_ORDER = ["group_stage", "qualification", "knockout_exact", "awards"];

const RULE_LABELS: Record<string, string> = {
  correct_sign: "Signo correcto (1X2)",
  exact_score: "Resultado exacto (bonus adicional)",
  group_pos_1st: "1º de grupo acertado",
  group_pos_2nd: "2º de grupo acertado",
  group_pos_3rd: "3º de grupo acertado",
  group_pos_4th: "4º de grupo acertado",
  exact_r32: "Resultado exacto en dieciseisavos",
  exact_r16: "Resultado exacto en octavos",
  exact_qf: "Resultado exacto en cuartos / semifinal",
  exact_third: "Resultado exacto en 3er puesto",
  exact_final: "Resultado exacto en la final",
  qualify_r32: "Equipo clasificado a dieciseisavos",
  qualify_r16: "Equipo clasificado a octavos",
  qualify_qf: "Equipo clasificado a cuartos",
  qualify_sf: "Equipo clasificado a semis",
  qualify_champion: "Campeón del torneo acertado",
  qualify_third: "3er puesto acertado",
  golden_boot: "Bota de Oro acertada",
  golden_ball: "Balón de Oro acertado",
  golden_glove: "Guante de Oro acertado",
};

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

  const configRows = (config ?? []) as TournamentConfig[];
  const configMap = new Map(configRows.map((c) => [c.key, c.value]));
  const lockDatetime = configMap.get("lock_datetime");
  const paymentAmount = formatPaymentAmount(configMap.get("payment_amount"));

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
  for (const rule of (rules ?? []) as ScoringRule[]) {
    const cat = rule.category ?? "other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(rule);
  }

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const sections = [
    {
      num: "01",
      title: "Participación",
      color: "text-red",
    },
    {
      num: "02",
      title: "Predicciones",
      color: "text-blue",
    },
    {
      num: "03",
      title: "Puntuación",
      color: "text-gold",
    },
    {
      num: "04",
      title: "Premios",
      color: "text-green",
    },
  ];

  return (
    <div className="pb-8 space-y-1">
      {/* Header */}
      <div className="px-1 pb-4 pt-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-1">Mundial &apos;26</p>
        <h1 className="font-marcador text-5xl uppercase text-ink leading-none">Normas</h1>
      </div>

      {/* Index strip */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {sections.map((s, i) => (
          <a
            key={s.num}
            href={`#sec-${s.num}`}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""} hover:bg-surface-sunken transition-colors`}
          >
            <span className={`font-marcador text-sm ${s.color} w-6`}>{s.num}</span>
            <span className="font-marcador text-sm uppercase tracking-wide text-ink">{s.title}</span>
          </a>
        ))}
      </div>

      {/* ── 01 PARTICIPACIÓN ── */}
      <div id="sec-01" className="pt-6 space-y-3">
        <SectionHeader num="01" title="Participación" color="text-red" />

        <RuleCard>
          <RuleRow
            label="Cuota de inscripción"
            value={`€${paymentAmount}`}
            highlight
          />
          <RuleRow
            label="Fecha límite de pago"
            value={lockLabel}
          />
          <RuleRow
            label="Método de pago"
            value="Transferencia bancaria con concepto PORRA + usuario"
          />
          <RuleRow
            label="Solo participan en el bote"
            value="los usuarios que hayan pagado antes del cierre"
          />
        </RuleCard>

        <InfoBox color="red">
          El pago debe realizarse <strong>antes del inicio del torneo</strong>. Quien no haya pagado
          antes del cierre no contará en la clasificación ni optará a ningún premio,
          aunque pueda seguir haciendo predicciones.
        </InfoBox>
      </div>

      {/* ── 02 PREDICCIONES ── */}
      <div id="sec-02" className="pt-6 space-y-3">
        <SectionHeader num="02" title="Predicciones" color="text-blue" />

        <RuleCard>
          <RuleRow label="Cierre de predicciones" value={lockLabel} highlight />
          <RuleRow label="Partidos de grupos" value="Predice el marcador exacto de cada partido" />
          <RuleRow label="Clasificación de grupos" value="Predice el orden final de los 4 equipos de cada grupo" />
          <RuleRow label="Eliminatorias" value="Predice el marcador exacto en 90 minutos" />
          <RuleRow label="Premios individuales" value="Bota de Oro · Balón de Oro · Guante de Oro" />
        </RuleCard>

        <InfoBox color="blue">
          En cuanto arranque el primer partido, <strong>las predicciones se bloquean automáticamente</strong>.
          No se puede editar nada después del cierre, sin excepciones.
          Solo se puntúan las predicciones realizadas antes de ese momento.
        </InfoBox>
      </div>

      {/* ── 03 PUNTUACIÓN ── */}
      <div id="sec-03" className="pt-6 space-y-3">
        <SectionHeader num="03" title="Puntuación" color="text-gold" />

        {orderedCategories.map((cat) => {
          const catRules = byCategory.get(cat) ?? [];
          return (
            <div key={cat} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-sunken border-b border-border">
                <p className="font-marcador text-xs uppercase tracking-wider text-ink-muted">
                  {CATEGORY_LABELS[cat] ?? cat}
                </p>
              </div>
              {catRules.map((rule, i) => (
                <div
                  key={rule.rule_key}
                  className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <span className="text-sm text-ink flex-1 mr-4">
                    {RULE_LABELS[rule.rule_key] ?? rule.description}
                  </span>
                  <span className="font-marcador text-lg text-gold flex-shrink-0">
                    +{rule.points} pts
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        {orderedCategories.length === 0 && (
          <div className="bg-surface border border-border rounded-xl px-4 py-8 text-center text-sm text-ink-muted">
            La tabla de puntuación se cargará cuando el administrador configure las reglas.
          </div>
        )}

        <InfoBox color="gold">
          En eliminatorias, el resultado que hay que acertar es el del tiempo reglamentario:
          90 minutos. Si hay empate, se elige aparte qué equipo pasa.
        </InfoBox>
      </div>

      {/* ── 04 PREMIOS ── */}
      <div id="sec-04" className="pt-6 space-y-3">
        <SectionHeader num="04" title="Premios" color="text-green" />

        <RuleCard>
          <RuleRow label="Todo lo recaudado va al bote" value="Sin comisión de la plataforma" />
          <RuleRow label="1º clasificado" value="60% del bote" highlight />
          <RuleRow label="2º clasificado" value="25% del bote" />
          <RuleRow label="3º clasificado" value="10% del bote" />
          <RuleRow label="Campeón de fase de grupos" value="5% del bote" />
          <RuleRow label="Farolillo rojo (último)" value={`€${paymentAmount} fijo — recupera la entrada`} />
        </RuleCard>

        <InfoBox color="green">
          El bote se reparte entre los porcentajes indicados <strong>una vez descontados los €{paymentAmount} del farolillo rojo</strong>.
          Los importes se redondean al euro inferior. Consulta el bote en tiempo real en{" "}
          <Link href="/bote" className="underline font-semibold">la página del Bote</Link>.
        </InfoBox>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-sunken border-b border-border">
            <p className="font-marcador text-xs uppercase tracking-wider text-ink-muted">Farolillo rojo</p>
          </div>
          <div className="px-4 py-4 space-y-1.5">
            <p className="text-sm text-ink">
              El <strong>último clasificado</strong> recibe <strong>€{paymentAmount}</strong> del bote —
              exactamente lo que pagó de inscripción. Le sale gratis.
            </p>
            <p className="text-sm text-ink-muted">
              Si hay empate en el último puesto al final del torneo, el premio se reparte a partes iguales entre los empatados.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-ink-faint pt-6 px-4">
        Las normas pueden actualizarse antes del inicio del torneo.
        Cualquier duda, pregunta en el chat.
      </p>
    </div>
  );
}

function SectionHeader({ num, title, color }: { num: string; title: string; color: string }) {
  return (
    <div className="flex items-baseline gap-3 px-1">
      <span className={`font-marcador text-sm ${color}`}>{num}</span>
      <h2 className="font-marcador text-2xl uppercase text-ink leading-none">{title}</h2>
    </div>
  );
}

function RuleCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {children}
    </div>
  );
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
    <div className="flex items-start justify-between gap-4 px-4 py-3 border-b border-border last:border-0">
      <span className="text-sm text-ink-muted flex-shrink-0 max-w-[45%]">{label}</span>
      <span className={`text-sm text-right ${highlight ? "font-semibold text-ink" : "text-ink"}`}>
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
