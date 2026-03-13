"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award } from "lucide-react";

interface RankingEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  group_stage_points: number;
  knockout_exact_points: number;
  qualification_points: number;
  award_points: number;
  has_paid: boolean;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: scores } = await supabase
        .from("user_scores")
        .select(`
          user_id,
          total_points,
          group_stage_points,
          knockout_exact_points,
          qualification_points,
          award_points
        `)
        .order("total_points", { ascending: false });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, has_paid");

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const entries: RankingEntry[] = (scores || [])
        .map((s) => {
          const profile = profileMap.get(s.user_id);
          return {
            ...s,
            display_name: profile?.display_name || "Desconocido",
            has_paid: profile?.has_paid ?? false,
          };
        })
        .filter((e) => e.has_paid);

      setRanking(entries);
    }
    load();

    // Realtime subscription
    const channel = supabase
      .channel("user_scores_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_scores" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getMedalIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-5 w-5 text-yellow-400" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (position === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="w-5 text-center text-sm text-muted-foreground">{position}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ranking</h1>
        <p className="text-muted-foreground text-sm">
          Solo participantes con pago confirmado
        </p>
      </div>

      {ranking.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aún no hay puntuaciones disponibles.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-3 px-4">#</th>
                    <th className="text-left py-3 px-2">Jugador</th>
                    <th className="text-center py-3 px-2">Grupo</th>
                    <th className="text-center py-3 px-2">Elim.</th>
                    <th className="text-center py-3 px-2">Clasif.</th>
                    <th className="text-center py-3 px-2">Premios</th>
                    <th className="text-center py-3 px-4 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((entry, i) => (
                    <tr
                      key={entry.user_id}
                      className={cn(
                        "border-b border-border/50 transition-colors",
                        entry.user_id === currentUserId && "bg-primary/10",
                        i < 3 && "bg-[hsl(var(--gold))]/5"
                      )}
                    >
                      <td className="py-3 px-4">{getMedalIcon(i + 1)}</td>
                      <td className="py-3 px-2">
                        <span className="font-medium">{entry.display_name}</span>
                        {entry.user_id === currentUserId && (
                          <Badge variant="secondary" className="ml-2 text-xs">Tú</Badge>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">{entry.group_stage_points}</td>
                      <td className="text-center py-3 px-2">{entry.knockout_exact_points}</td>
                      <td className="text-center py-3 px-2">{entry.qualification_points}</td>
                      <td className="text-center py-3 px-2">{entry.award_points}</td>
                      <td className="text-center py-3 px-4 font-bold text-primary">
                        {entry.total_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
