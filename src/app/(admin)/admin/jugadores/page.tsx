"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/ui/flag";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Plus } from "lucide-react";

interface Player {
  id: number;
  name: string;
  team_id: number;
  position: string;
}

interface Team {
  id: number;
  name: string;
  flag_emoji: string;
}

export default function AdminJugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [newName, setNewName] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [playersRes, teamsRes] = await Promise.all([
        supabase.from("players").select("*").order("name"),
        supabase.from("teams").select("id, name, flag_emoji").order("name"),
      ]);
      setPlayers(playersRes.data || []);
      setTeams(teamsRes.data || []);
    }
    load();
  }, []);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  const handleAdd = async () => {
    if (!newName.trim()) return;

    const { data, error } = await supabase
      .from("players")
      .insert({
        name: newName.trim(),
        team_id: newTeamId ? parseInt(newTeamId) : null,
        position: newPosition || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPlayers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewTeamId("");
      setNewPosition("");
      toast({ title: "Jugador añadido" });
    }
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-marcador font-bold uppercase tracking-wide text-2xl text-ink">Jugadores</h1>
        <Badge variant="outline">
          <span className="font-marcador">{players.length}</span>&nbsp;jugadores
        </Badge>
      </div>

      {/* Add player form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Añadir Jugador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-ink-muted">Nombre</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del jugador"
              />
            </div>
            <div className="w-48">
              <Label className="text-xs text-ink-muted">Equipo</Label>
              <Select value={newTeamId} onValueChange={setNewTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Equipo..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      <span className="flex items-center gap-1"><Flag emoji={t.flag_emoji} size={16} />{t.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Label className="text-xs text-ink-muted">Posición</Label>
              <Input
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="DEL, MED..."
              />
            </div>
            <Button onClick={handleAdd} size="icon" variant="default">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Players list */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {players.map((p) => {
              const team = teamsMap.get(p.team_id);
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-2 hover:bg-surface-sunken/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Flag emoji={team?.flag_emoji || ""} size={18} />
                    <span className="font-medium text-sm text-ink">{p.name}</span>
                    {p.position && (
                      <Badge variant="secondary" className="text-xs">{p.position}</Badge>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-ink-faint hover:text-red transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {players.length === 0 && (
              <p className="text-center text-ink-muted py-8 font-sans">
                No hay jugadores cargados.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
