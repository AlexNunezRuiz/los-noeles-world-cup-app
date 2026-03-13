"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Trash2 } from "lucide-react";

interface Message {
  id: string;
  user_id: string;
  message: string;
  is_deleted: boolean;
  created_at: string;
}

export default function AdminChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [msgsRes, profilesRes] = await Promise.all([
        supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("id, display_name"),
      ]);
      setMessages(msgsRes.data || []);

      const profMap = new Map<string, string>();
      for (const p of profilesRes.data || []) {
        profMap.set(p.id, p.display_name);
      }
      setProfiles(profMap);
    }
    load();

    const channel = supabase
      .channel("admin_chat")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("chat_messages")
      .update({ is_deleted: true })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_deleted: true } : m)));
      toast({ title: "Mensaje eliminado" });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Moderación Chat</h1>

      <div className="space-y-2">
        {messages.map((msg) => (
          <Card key={msg.id} className={msg.is_deleted ? "opacity-40" : ""}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium">{profiles.get(msg.user_id) || "?"}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleString("es-ES")}
                  </span>
                  {msg.is_deleted && <Badge variant="destructive" className="text-xs">Eliminado</Badge>}
                </div>
                <p className="text-sm truncate">{msg.message}</p>
              </div>
              {!msg.is_deleted && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(msg.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
