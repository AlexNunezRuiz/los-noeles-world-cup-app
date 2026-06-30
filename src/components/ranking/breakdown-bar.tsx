"use client";

import { BREAKDOWN_TYPES, BREAKDOWN_META, type BreakdownType } from "@/lib/scoring/breakdown";

export type BreakdownData = Record<BreakdownType, number>;

export function BreakdownBar({ data }: { data: BreakdownData }) {
  const total = BREAKDOWN_TYPES.reduce((sum, type) => sum + (data[type] || 0), 0);
  return (
    <div className="flex h-2.5 overflow-hidden rounded-md bg-surface-sunken">
      {BREAKDOWN_TYPES.map((type) => {
        const value = data[type] || 0;
        const pct = total > 0 ? (value / total) * 100 : 0;
        if (pct === 0) return null;
        return (
          <span
            key={type}
            className="block h-full"
            style={{ width: `${pct}%`, background: BREAKDOWN_META[type].color }}
            title={`${BREAKDOWN_META[type].label}: ${value}`}
          />
        );
      })}
    </div>
  );
}

export function BreakdownLegend({
  data,
  hideZero = false,
}: {
  data: BreakdownData;
  hideZero?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
      {BREAKDOWN_TYPES.map((type) => {
        const value = data[type] || 0;
        if (hideZero && value === 0) return null;
        return (
          <span
            key={type}
            className="flex items-center justify-between gap-1.5 text-[11px] font-bold text-ink-muted"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ background: BREAKDOWN_META[type].color }}
              />
              <span className="truncate">{BREAKDOWN_META[type].short}</span>
            </span>
            <span className="font-marcador font-bold text-ink">{value}</span>
          </span>
        );
      })}
    </div>
  );
}
