"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, MessageCircle, Settings, Trophy, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NotificationRow {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  chat_messages?: { message: string } | null;
}

const TYPE_FALLBACKS: Record<string, { title: string; link: string; icon: typeof Bell }> = {
  mention: { title: "Te han mencionado", link: "/chat", icon: MessageCircle },
  admin_update: { title: "Configuracion actualizada", link: "/normas", icon: Settings },
  config_update: { title: "Configuracion actualizada", link: "/normas", icon: Settings },
  result_update: { title: "Nuevo resultado", link: "/resultados", icon: Activity },
  ranking_update: { title: "Clasificacion actualizada", link: "/ranking", icon: Trophy },
  correct_prediction: { title: "Has puntuado", link: "/resultados", icon: CheckCircle2 },
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setupNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const userId = user.id;

      async function load() {
        const { data } = await supabase
          .from("notifications")
          .select("id, type, title, body, link, read_at, created_at, chat_messages(message)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (mounted) setNotifications((data || []) as NotificationRow[]);

        await supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("user_id", userId)
          .is("read_at", null);
      }

      await load();
      channel = supabase
        .channel(`notifications_page:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void load();
          }
        )
        .subscribe();
    }

    void setupNotifications();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 pb-6">
      <div className="px-1">
        <h1 className="font-marcador text-3xl uppercase leading-tight text-ink">Notificaciones</h1>
        <p className="mt-1 text-sm text-ink-muted">Menciones, resultados, ranking y avisos de la porra.</p>
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => {
          const fallback = TYPE_FALLBACKS[notification.type] ?? { title: "Notificacion", link: "/porra", icon: Bell };
          const Icon = fallback.icon;
          const href = notification.link || fallback.link;
          return (
            <Link
              key={notification.id}
              href={href}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-sunken"
            >
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">
                    {notification.title || fallback.title}
                  </span>
                  <span className="flex-shrink-0 text-[10px] text-ink-faint">
                    {formatDate(notification.created_at)}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                  {notification.body || notification.chat_messages?.message || "Toca para ver el detalle."}
                </span>
              </span>
            </Link>
          );
        })}

        {notifications.length === 0 && (
          <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center">
            <Bell className="mx-auto h-6 w-6 text-ink-faint" />
            <p className="mt-2 text-sm font-semibold text-ink">Sin notificaciones</p>
            <p className="mt-1 text-xs text-ink-muted">Cuando haya novedades apareceran aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}
