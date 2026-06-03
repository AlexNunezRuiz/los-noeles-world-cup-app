"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { UserStatusIcon } from "@/components/users/user-status-icon";
import { Send, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_deleted: boolean;
  created_at: string;
}

interface ProfileOption {
  id: string;
  display_name: string;
  username: string | null;
  has_paid: boolean;
  is_admin: boolean;
}

interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

const REACTION_EMOJIS = ["🇪🇸", "🇦🇷", "🇧🇷", "🇫🇷", "🇩🇪", "🇵🇹", "🇲🇽", "🇺🇾", "🇯🇵", "🇲🇦"];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [isBanned, setIsBanned] = useState(false);
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Map<string, ProfileOption>>(new Map());
  const [reactions, setReactions] = useState<ChatReaction[]>([]);
  const [openReactionMessageId, setOpenReactionMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: profile }, { data: allProfiles }, { data: msgs }, { data: reactionRows }] =
        await Promise.all([
          supabase.from("profiles").select("is_chat_banned").eq("id", user.id).single(),
          supabase.from("profiles").select("id, display_name, username, has_paid, is_admin"),
          supabase
            .from("chat_messages")
            .select("*")
            .eq("is_deleted", false)
            .order("created_at", { ascending: true })
            .limit(100),
          supabase.from("chat_message_reactions").select("*"),
        ]);

      setIsBanned(profile?.is_chat_banned ?? false);
      setMessages((msgs || []) as ChatMessage[]);
      setReactions((reactionRows || []) as ChatReaction[]);

      const profMap = new Map<string, ProfileOption>();
      for (const p of (allProfiles || []) as ProfileOption[]) profMap.set(p.id, p);
      setProfiles(profMap);

      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("type", ["mention", "admin_update"])
        .is("read_at", null);
    }

    load();

    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload: { new: ChatMessage }) => {
          const msg = payload.new;
          if (!msg.is_deleted) setMessages((prev) => [...prev, msg]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        (payload: { new: ChatMessage }) => {
          const msg = payload.new;
          if (msg.is_deleted) setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_message_reactions" },
        async () => {
          const { data } = await supabase.from("chat_message_reactions").select("*");
          setReactions((data || []) as ChatReaction[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const filteredMentionProfiles = (() => {
    const match = newMessage.match(/@([\w.-]*)$/);
    if (!match) return [];
    const query = match[1].toLowerCase();
    return Array.from(profiles.values())
      .filter((profile) => {
        if (profile.id === userId) return false;
        return (
          profile.username?.toLowerCase().includes(query) ||
          profile.display_name.toLowerCase().includes(query)
        );
      })
      .slice(0, 5);
  })();

  const insertMention = (profile: ProfileOption) => {
    const token = profile.username || profile.display_name.toLowerCase().replace(/\s+/g, ".");
    setNewMessage((prev) => prev.replace(/@[\w.-]*$/, `@${token} `));
  };

  const mentionedProfilesFor = (text: string) => {
    const tokens = Array.from(text.matchAll(/@([\w.-]+)/g)).map((match) => match[1].toLowerCase());
    const mentioned = Array.from(profiles.values()).filter((profile) => {
      const username = profile.username?.toLowerCase();
      const display = profile.display_name.toLowerCase().replace(/\s+/g, ".");
      return tokens.includes(username ?? "") || tokens.includes(display);
    });
    return Array.from(new Map(mentioned.map((profile) => [profile.id, profile])).values()).filter(
      (profile) => profile.id !== userId
    );
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = newMessage.trim();
    if (!text || !userId || isBanned) return;

    setSending(true);
    setNewMessage("");

    const { data: inserted, error } = await supabase
      .from("chat_messages")
      .insert({ user_id: userId, message: text })
      .select("id")
      .single();

    setSending(false);

    if (error) {
      toast({ title: "Error al enviar", description: error.message, variant: "destructive" });
      setNewMessage(text);
      return;
    }

    const mentioned = mentionedProfilesFor(text);
    if (inserted?.id && mentioned.length > 0) {
      await supabase.from("chat_message_mentions").insert(
        mentioned.map((profile) => ({
          message_id: inserted.id,
          mentioned_user_id: profile.id,
        }))
      );
      await supabase.from("notifications").insert(
        mentioned.map((profile) => ({
          user_id: profile.id,
          actor_user_id: userId,
          type: "mention",
          message_id: inserted.id,
        }))
      );
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return;
    setOpenReactionMessageId(null);
    const existing = reactions.find(
      (reaction) =>
        reaction.message_id === messageId && reaction.user_id === userId && reaction.emoji === emoji
    );
    if (existing) {
      await supabase.from("chat_message_reactions").delete().eq("id", existing.id);
      setReactions((prev) => prev.filter((reaction) => reaction.id !== existing.id));
      return;
    }
    const { data } = await supabase
      .from("chat_message_reactions")
      .insert({ message_id: messageId, user_id: userId, emoji })
      .select("*")
      .single();
    if (data) setReactions((prev) => [...prev, data as ChatReaction]);
  };

  const groupedReactionsFor = (messageReactions: ChatReaction[]) =>
    REACTION_EMOJIS.map((emoji) => {
      const matching = messageReactions.filter((reaction) => reaction.emoji === emoji);
      return {
        emoji,
        count: matching.length,
        active: matching.some((reaction) => reaction.user_id === userId),
      };
    }).filter((reaction) => reaction.count > 0);

  const renderMessage = (message: string) =>
    message.split(/(@[\w.-]+)/g).map((part, index) =>
      part.startsWith("@") ? (
        <span key={`${part}-${index}`} className="font-bold text-blue">
          {part}
        </span>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col md:h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="font-marcador text-3xl uppercase tracking-wide text-ink">Chat</h1>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-cream p-4">
          {messages.length === 0 && (
            <p className="py-8 text-center font-sans text-sm text-ink-faint">
              No hay mensajes aún. Sé el primero.
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.user_id === userId;
            const author = profiles.get(msg.user_id);
            const name = author?.display_name || "Anónimo";
            const messageReactions = reactions.filter((reaction) => reaction.message_id === msg.id);
            const groupedReactions = groupedReactionsFor(messageReactions);

            return (
              <div
                key={msg.id}
                className={cn("relative flex max-w-[80%] flex-col", isMe ? "ml-auto items-end" : "items-start")}
              >
                <span className="mb-0.5 inline-flex items-center gap-1 font-sans text-xs text-ink-faint">
                  {author && <UserStatusIcon is_admin={author.is_admin} has_paid={author.has_paid} />}
                  <span>{name}</span>
                  <span>&middot;</span>
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <div className={cn("flex items-end gap-1.5", isMe && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 font-sans text-sm",
                      isMe ? "bg-red text-white" : "border border-border bg-surface text-ink"
                    )}
                  >
                    {renderMessage(msg.message)}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenReactionMessageId((current) => (current === msg.id ? null : msg.id))
                    }
                    className="mb-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink-muted shadow-sm transition-colors hover:border-red/40 hover:text-red"
                    aria-label="Reaccionar al mensaje"
                  >
                    <SmilePlus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {openReactionMessageId === msg.id && (
                  <div
                    className={cn(
                      "absolute top-full z-20 mt-1 grid grid-cols-5 gap-1 rounded-lg border border-border bg-surface p-1.5 shadow-lg",
                      isMe ? "right-0" : "left-0"
                    )}
                  >
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => toggleReaction(msg.id, emoji)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-surface-sunken"
                        aria-label={`Reaccionar con ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {groupedReactions.length > 0 && (
                  <div className={cn("mt-1 flex flex-wrap gap-1", isMe ? "justify-end" : "justify-start")}>
                    {groupedReactions.map((reaction) => (
                      <button
                        key={reaction.emoji}
                        type="button"
                        onClick={() => toggleReaction(msg.id, reaction.emoji)}
                        className={cn(
                          "inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs transition-colors",
                          reaction.active
                            ? "border-red bg-red/10 text-red"
                            : "border-border bg-surface text-ink-muted hover:text-ink"
                        )}
                        aria-label={`Reaccion ${reaction.emoji}: ${reaction.count}`}
                      >
                        <span>{reaction.emoji}</span>
                        {reaction.count > 1 && <span className="ml-1 font-marcador">{reaction.count}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-border bg-surface p-3">
          {isBanned ? (
            <p className="py-1 text-center font-sans text-sm text-red">Estás baneado del chat.</p>
          ) : (
            <form onSubmit={handleSend} className="relative flex gap-2">
              <div className="relative flex-1">
                {filteredMentionProfiles.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                    {filteredMentionProfiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => insertMention(profile)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-sunken"
                      >
                        <span className="font-semibold text-ink">{profile.display_name}</span>
                        {profile.username && (
                          <span className="text-xs text-ink-muted">@{profile.username}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <Input
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  placeholder="Escribe un mensaje..."
                  maxLength={500}
                  disabled={sending}
                  className="bg-surface-sunken border-border text-ink placeholder:text-ink-faint"
                />
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={sending || !newMessage.trim()}
                className="shrink-0 bg-red text-white hover:bg-red-strong"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
