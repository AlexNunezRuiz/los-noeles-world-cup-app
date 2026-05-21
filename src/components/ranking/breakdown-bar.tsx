"use client";

interface BreakdownBarProps {
  grupos: number;
  cuadro: number;
  clasif: number;
  premios: number;
}

const PARTS = [
  { key: "grupos" as const, label: "Grupos", color: "var(--red)" },
  { key: "cuadro" as const, label: "Cuadro", color: "var(--green)" },
  { key: "clasif" as const, label: "Clasif.", color: "var(--blue)" },
  { key: "premios" as const, label: "Premios", color: "var(--gold)" },
];

export function BreakdownBar(props: BreakdownBarProps) {
  const total = props.grupos + props.cuadro + props.clasif + props.premios;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-md bg-surface-sunken">
        {PARTS.map((p) => {
          const value = props[p.key];
          const pct = total > 0 ? (value / total) * 100 : 0;
          return (
            <span
              key={p.key}
              className="block h-full"
              style={{ width: `${pct}%`, background: p.color }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {PARTS.map((p) => (
          <span key={p.key} className="flex items-center gap-1 text-[10px] font-bold text-ink-muted">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {p.label} {props[p.key]}
          </span>
        ))}
      </div>
    </div>
  );
}
