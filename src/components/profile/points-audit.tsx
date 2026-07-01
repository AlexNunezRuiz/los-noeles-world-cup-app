"use client";

import { ChevronDown } from "lucide-react";
import { Flag } from "@/components/ui/flag";
import { BREAKDOWN_META, type BreakdownType } from "@/lib/scoring/breakdown";
import type {
  GroupOrderAudit,
  MatchAuditRow,
  QualifiedRoundRow,
} from "@/lib/results/points-audit";

export interface TeamLite {
  name: string;
  flag_emoji: string;
}

export interface EliminatoriaRow {
  key: string;
  detail: string;
  points: number;
}

export interface PremioRow {
  label: string;
  pick: string;
  correct: boolean | null;
  points: number;
}

interface PointsAuditProps {
  teams: Map<number, TeamLite>;
  matchAudit: { rows: MatchAuditRow[]; signTotal: number; exactTotal: number };
  orderAudit: { groups: GroupOrderAudit[]; total: number };
  qualifiedByRound: QualifiedRoundRow[];
  eliminatorias: EliminatoriaRow[];
  premios: PremioRow[];
}

function teamLabel(teams: Map<number, TeamLite>, id: number | null) {
  if (id == null) return { name: "?", flag: "" };
  const t = teams.get(id);
  return { name: t?.name ?? `#${id}`, flag: t?.flag_emoji ?? "" };
}

function Section({
  type,
  count,
  points,
  defaultOpen = false,
  children,
}: {
  type: BreakdownType;
  count?: string;
  points: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const meta = BREAKDOWN_META[type];
  return (
    <details open={defaultOpen} className="group rounded-xl border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5">
        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: meta.color }} />
        <span className="flex-1 font-marcador text-sm uppercase tracking-wide text-ink">
          {meta.label}
        </span>
        {count && <span className="text-[11px] font-semibold text-ink-muted">{count}</span>}
        <span className="font-marcador text-base font-bold text-ink">{points}</span>
        <ChevronDown className="h-4 w-4 text-ink-faint transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-dashed border-border px-3 py-2">{children}</div>
    </details>
  );
}

function ResultBadge({ ok, strong, label }: { ok: boolean; strong?: boolean; label: string }) {
  return (
    <span
      className={
        ok
          ? strong
            ? "rounded bg-green/15 px-1.5 py-0.5 text-[10px] font-bold text-green"
            : "rounded bg-green/10 px-1.5 py-0.5 text-[10px] font-bold text-green"
          : "rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] font-bold text-ink-faint"
      }
    >
      {label}
    </span>
  );
}

export function PointsAudit({
  teams,
  matchAudit,
  orderAudit,
  qualifiedByRound,
  eliminatorias,
  premios,
}: PointsAuditProps) {
  return (
    <section className="space-y-2">
      <h2 className="font-marcador text-lg uppercase tracking-wide text-ink">Desglose de puntos</h2>
      <p className="text-[11px] text-ink-muted">
        De dónde sale cada punto. Verde = acierto. Los totales coinciden con la clasificación.
      </p>

      {/* Signo + Exacto */}
      <Section type="signo" points={matchAudit.signTotal} count={`${matchAudit.rows.filter((r) => r.signOk).length} aciertos`}>
        {matchAudit.rows.length === 0 ? (
          <p className="py-1 text-xs italic text-ink-muted">Sin partidos de grupos jugados.</p>
        ) : (
          <div className="space-y-0.5">
            <p className="mb-1 text-[10px] font-semibold uppercase text-ink-faint">
              Resultado exacto suma {matchAudit.exactTotal} pts extra (incluido abajo)
            </p>
            {matchAudit.rows.map((r) => {
              const home = teamLabel(teams, r.homeTeamId);
              const away = teamLabel(teams, r.awayTeamId);
              return (
                <div
                  key={r.matchId}
                  className="flex items-center gap-1.5 border-b border-border py-1 text-xs last:border-b-0"
                >
                  <span className="flex min-w-0 flex-1 items-center justify-end gap-1 text-right">
                    <span className="truncate text-ink">{home.name}</span>
                    {home.flag && <Flag emoji={home.flag} size={16} />}
                  </span>
                  <span className="font-marcador font-bold text-ink">
                    {r.realHome}-{r.realAway}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1">
                    {away.flag && <Flag emoji={away.flag} size={16} />}
                    <span className="truncate text-ink">{away.name}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-ink-faint">tú {r.predHome}-{r.predAway}</span>
                  {r.exactOk ? (
                    <ResultBadge ok strong label="Exacto" />
                  ) : r.signOk ? (
                    <ResultBadge ok label="Signo" />
                  ) : (
                    <ResultBadge ok={false} label="—" />
                  )}
                  <span className="w-7 shrink-0 text-right font-marcador font-bold text-ink">
                    {r.points > 0 ? `+${r.points}` : "0"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Orden de grupos */}
      <Section type="orden" points={orderAudit.total}>
        {orderAudit.groups.length === 0 ? (
          <p className="py-1 text-xs italic text-ink-muted">Sin grupos para evaluar.</p>
        ) : (
          <div className="space-y-2">
            {orderAudit.groups.map((g) => (
              <div key={g.groupLetter}>
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="font-marcador text-[11px] uppercase text-ink-muted">
                    Grupo {g.groupLetter}
                  </span>
                  <span className="font-marcador text-[11px] font-bold text-ink">+{g.points}</span>
                </div>
                {g.rows.map((row) => {
                  const team = teamLabel(teams, row.teamId);
                  return (
                    <div
                      key={row.teamId}
                      className="flex items-center gap-1.5 border-b border-border py-0.5 text-xs last:border-b-0"
                    >
                      <span className="w-4 text-center font-marcador font-bold text-ink-faint">
                        {row.actualPosition}
                      </span>
                      {team.flag && <Flag emoji={team.flag} size={16} />}
                      <span className="flex-1 truncate text-ink">{team.name}</span>
                      <span className="text-[10px] text-ink-faint">
                        tú: {row.predictedPosition ?? "—"}º
                      </span>
                      <ResultBadge ok={row.ok} label={row.ok ? `+${row.points}` : "✗"} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Clasificados por ronda */}
      <Section
        type="clasificados"
        points={qualifiedByRound.reduce((s, r) => s + r.points, 0)}
      >
        {qualifiedByRound.length === 0 ? (
          <p className="py-1 text-xs italic text-ink-muted">Sin clasificados puntuados todavía.</p>
        ) : (
          <div className="space-y-2">
            {qualifiedByRound.map((round) => (
              <div key={round.ruleKey}>
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="font-marcador text-[11px] uppercase text-ink-muted">{round.label}</span>
                  <span className="font-marcador text-[11px] font-bold text-ink">+{round.points}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {round.teamIds.map((teamId, i) => {
                    const team = teamLabel(teams, teamId);
                    return (
                      <span
                        key={`${teamId}-${i}`}
                        className="flex items-center gap-1 rounded-md bg-green/10 px-1.5 py-1 text-[11px] font-semibold text-green"
                      >
                        {team.flag && <Flag emoji={team.flag} size={14} />}
                        {team.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Eliminatorias (exacto) — solo si hay */}
      {eliminatorias.length > 0 && (
        <Section type="eliminatorias" points={eliminatorias.reduce((s, e) => s + e.points, 0)}>
          <div className="space-y-0.5">
            {eliminatorias.map((e) => (
              <div
                key={e.key}
                className="flex items-center justify-between gap-2 border-b border-border py-1 text-xs last:border-b-0"
              >
                <span className="min-w-0 truncate text-ink">{e.detail}</span>
                <span className="shrink-0 font-marcador font-bold text-ink">+{e.points}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Premios — solo si hay pronósticos */}
      {premios.length > 0 && (
        <Section type="premios" points={premios.reduce((s, p) => s + p.points, 0)}>
          <div className="space-y-0.5">
            {premios.map((p) => (
              <div
                key={p.label}
                className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-xs last:border-b-0"
              >
                <span className="font-semibold text-ink-muted">{p.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-ink">{p.pick}</span>
                  {p.correct !== null && (
                    <ResultBadge ok={p.correct} label={p.correct ? `+${p.points}` : "✗"} />
                  )}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </section>
  );
}
