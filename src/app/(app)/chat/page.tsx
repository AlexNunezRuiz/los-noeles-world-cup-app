"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useToast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_deleted: boolean;
  created_at: string;
  display_name?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [isBanned, setIsBanned] = useState(false);
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Check if banned
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_chat_banned")
        .eq("id", user.id)
        .single();
      setIsBanned(profile?.is_chat_banned ?? false);

      // Load profiles for display names
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, display_name");
      const profMap = new Map<string, string>();
      for (const p of allProfiles || []) {
        profMap.set(p.id, p.display_name);
      }
      setProfiles(profMap);

      // Load recent messages
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages(msgs || []);
    }
    load();

    // Realtime subscription
    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (!msg.is_deleted) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg.is_deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !userId || isBanned) return;

    setSending(true);
    setNewMessage("");

    const { error } = await supabase.from("chat_messages").insert({
      user_id: userId,
      message: text,
    });

    setSending(false);

    if (error) {
      toast({ title: "Error al enviar", description: error.message, variant: "destructive" });
      setNewMessage(text);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Chat</h1>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No hay mensajes aún. ¡Sé el primero!
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.user_id === userId;
            const name = profiles.get(msg.user_id) || "Anónimo";

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  isMe ? "ml-auto items-end" : "items-start"
                )}
              >
                <span className="text-xs text-muted-foreground mb-0.5">
                  {name} &middot;{" "}
                  {new Date(msg.created_at).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {msg.message}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input area */}
        <div className="border-t p-3">
          {isBanned ? (
            <p className="text-center text-sm text-destructive">
              Estás baneado del chat.
            </p>
          ) : (
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                maxLength={500}
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
