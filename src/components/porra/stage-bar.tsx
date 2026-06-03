"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "grupos", label: "Grupos", href: "/predicciones/grupos", color: "var(--red)" },
  { key: "clasificados", label: "Clasificados", href: "/predicciones/clasificados", color: "var(--blue)" },
  { key: "eliminatorias", label: "Cuadro", href: "/predicciones/eliminatorias", color: "var(--green)" },
  { key: "premios", label: "Premios", href: "/predicciones/premios", color: "var(--gold)" },
];

/** progress: mapa fase→porcentaje 0..100 */
export function StageBar({ progress }: { progress: Record<string, number> }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="flex snap-x gap-1.5 overflow-x-auto px-3 py-2">
      {STAGES.map((s) => {
        const active = pathname.startsWith(s.href);
        return (
          <Link
            key={s.key}
            href={s.href}
            className={cn(
              "min-w-[8.25rem] shrink-0 snap-start rounded-md border px-2 pt-1.5 text-center transition-colors sm:min-w-0 sm:flex-1",
              active ? "border-ink bg-ink" : "border-border bg-surface"
            )}
          >
            <span className={cn("font-marcador text-[11px] font-bold uppercase",
              active ? "text-white" : "text-ink-muted")}>
              {s.label}
            </span>
            <span className={cn("mx-1 my-1.5 block h-[3px] overflow-hidden rounded-sm",
              active ? "bg-white/20" : "bg-surface-sunken")}>
              <span className="block h-full rounded-sm"
                style={{ width: `${progress[s.key] ?? 0}%`, background: s.color }} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
