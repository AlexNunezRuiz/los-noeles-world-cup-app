"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Flag } from "@/components/ui/flag";

interface TeamRow {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
  group_letter: string | null;
}

interface PlayerRow {
  id: number;
  name: string;
  position: string | null;
  shirt_number: number | null;
}

const POSITION_ORDER: Record<string, number> = {
  goalkeeper: 1,
  portero: 1,
  defender: 2,
  defensa: 2,
  midfielder: 3,
  centrocampista: 3,
  forward: 4,
  delantero: 4,
};

export default function EquipoPage() {
  const params = useParams<{ id: string }>();
  const teamId = Number(params?.id);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!teamId) return;
    async function load() {
      const [{ data: teamData }, { data: playerRows }] = await Promise.all([
        supabase.from("teams").select("id, name, code, flag_emoji, group_letter").eq("id", teamId).single(),
        supabase.from("players").select("id, name, position, shirt_number").eq("team_id", teamId),
      ]);
      setTeam(teamData as TeamRow | null);
      setPlayers((playerRows ?? []) as PlayerRow[]);
    }
    load();
  }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderedPlayers = useMemo(
    () =>
      [...players].sort((a, b) => {
        const posA = POSITION_ORDER[a.position?.toLowerCase() ?? ""] ?? 9;
        const posB = POSITION_ORDER[b.position?.toLowerCase() ?? ""] ?? 9;
        return posA - posB || (a.shirt_number ?? 99) - (b.shirt_number ?? 99) || a.name.localeCompare(b.name);
      }),
    [players]
  );

  if (!team) {
    return (
      <div className="space-y-4 pt-1">
        <Link href="/equipos" className="text-xs font-semibold text-ink-muted hover:text-ink">
          ← Equipos
        </Link>
        <p className="text-sm text-ink-muted">Equipo no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 pt-1">
      <Link href="/equipos" className="text-xs font-semibold text-ink-muted hover:text-ink">
        ← Equipos
      </Link>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <Flag emoji={team.flag_emoji} size={36} />
          <div>
            <h1 className="font-marcador text-3xl uppercase leading-none text-ink">{team.name}</h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Grupo {team.group_letter ?? "-"} · {team.code}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border bg-surface-sunken px-4 py-2">
          <p className="font-marcador text-xs uppercase tracking-wider text-ink-muted">
            Plantilla oficial
          </p>
        </div>
        {orderedPlayers.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-muted">
            Plantilla pendiente de importar desde la lista oficial FIFA.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {orderedPlayers.map((player) => (
              <div key={player.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 px-4 py-2.5">
                <span className="font-marcador text-base font-bold text-ink-faint">
                  {player.shirt_number ?? "-"}
                </span>
                <span className="text-sm font-semibold text-ink">{player.name}</span>
                <span className="text-xs text-ink-muted">{player.position ?? "-"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
