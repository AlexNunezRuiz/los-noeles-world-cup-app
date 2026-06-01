"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Flag } from "@/components/ui/flag";

interface TeamRow {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
  group_letter: string | null;
}

export default function EquiposPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("teams")
        .select("id, name, code, flag_emoji, group_letter")
        .order("group_letter")
        .order("name");
      setTeams((data ?? []) as TeamRow[]);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="font-marcador text-3xl uppercase text-ink">Equipos</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
          Plantillas oficiales FIFA
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {teams.map((team) => (
          <Link
            key={team.id}
            href={`/equipos/${team.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:bg-surface-sunken"
          >
            <Flag emoji={team.flag_emoji} size={24} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{team.name}</p>
              <p className="font-marcador text-[10px] uppercase tracking-widest text-ink-muted">
                Grupo {team.group_letter ?? "-"} · {team.code}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
