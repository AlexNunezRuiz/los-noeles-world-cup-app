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

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

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
          Grupos, selecciones y plantillas oficiales FIFA
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((group) => {
          const groupTeams = teams.filter((team) => team.group_letter === group);
          if (groupTeams.length === 0) return null;

          return (
            <section key={group} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border bg-surface-sunken px-3 py-2">
                <h2 className="font-marcador text-sm uppercase tracking-widest text-ink-muted">
                  Grupo {group}
                </h2>
              </div>
              <div className="divide-y divide-border">
                {groupTeams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/equipos/${team.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-surface-sunken"
                  >
                    <Flag emoji={team.flag_emoji} size={24} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{team.name}</p>
                      <p className="font-marcador text-[10px] uppercase tracking-widest text-ink-muted">
                        {team.code}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
