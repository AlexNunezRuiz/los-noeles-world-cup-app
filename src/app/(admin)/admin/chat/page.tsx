"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { UserStatusIcon } from "@/components/users/user-status-icon";
import { Trash2 } from "lucide-react";

interface Message {
  id: string;
  user_id: string;
  message: string;
  is_deleted: boolean;
  created_at: string;
}

interface ProfileSummary {
  display_name: string;
  has_paid: boolean;
  is_admin: boolean;
}

export default function AdminChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileSummary>>(new Map());
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [msgsRes, profilesRes] = await Promise.all([
        supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("id, display_name, has_paid, is_admin"),
      ]);
      setMessages(msgsRes.data || []);

      const profMap = new Map<string, ProfileSummary>();
      for (const p of profilesRes.data || []) {
        profMap.set(p.id, {
          display_name: p.display_name,
          has_paid: p.has_paid,
          is_admin: p.is_admin,
        });
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
      <div className="flex items-center justify-between">
        <h1 className="font-marcador font-bold uppercase tracking-wide text-2xl text-ink">Moderación Chat</h1>
        <Badge variant="outline">
          <span className="font-marcador">{messages.length}</span>&nbsp;mensajes
        </Badge>
      </div>

      <div className="space-y-2">
        {messages.map((msg) => {
          const author = profiles.get(msg.user_id);

          return (
            <Card
              key={msg.id}
              className={`bg-surface border-border transition-opacity ${msg.is_deleted ? "opacity-40" : ""}`}
            >
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
                      {author && <UserStatusIcon is_admin={author.is_admin} has_paid={author.has_paid} />}
                      <span>{author?.display_name || "?"}</span>
                    </span>
                  <span className="text-xs text-ink-faint font-marcador">
                    {new Date(msg.created_at).toLocaleString("es-ES")}
                  </span>
                  {msg.is_deleted && (
                    <Badge variant="destructive" className="text-xs">Eliminado</Badge>
                  )}
                </div>
                <p className="text-sm truncate text-ink-muted font-sans">{msg.message}</p>
              </div>
              {!msg.is_deleted && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-ink-faint hover:text-red hover:bg-red/10 transition-colors"
                  onClick={() => handleDelete(msg.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              </CardContent>
            </Card>
          );
        })}
        {messages.length === 0 && (
          <p className="text-center text-ink-muted py-8 font-sans text-sm">
            No hay mensajes.
          </p>
        )}
      </div>
    </div>
  );
}
