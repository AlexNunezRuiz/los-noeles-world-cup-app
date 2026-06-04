"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, CalendarDays, Activity, Trophy, MessageCircle, User, Shield, Banknote, ScrollText, Bell } from "lucide-react";
import { Emblem } from "@/components/ui/emblem";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/porra", label: "Porra", icon: ClipboardList },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/resultados", label: "Resultados", icon: Activity },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/bote", label: "Bote", icon: Banknote },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

export function Navbar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname() ?? "";
  const [unreadCount, setUnreadCount] = useState(0);
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

      async function loadUnread() {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("read_at", null);
        if (mounted) setUnreadCount(count ?? 0);
      }

      await loadUnread();
      channel = supabase
        .channel(`navbar_notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void loadUnread();
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
    <>
      {/* Fixed header */}
      <header className="fixed left-0 right-0 z-50 h-14 bg-surface border-b border-border [top:env(safe-area-inset-top)] [transform:translateZ(0)]">
        <div className="max-w-[680px] mx-auto px-4 h-full flex items-center justify-between">
          {/* Wordmark */}
          <Link
            href="/porra"
            className="flex items-center gap-2 font-marcador font-bold uppercase text-xl text-ink leading-none"
          >
            <Emblem size={26} />
            Mundial<span className="text-red">&apos;26</span>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/normas"
              className="flex items-center justify-center w-8 h-8 text-ink-muted hover:text-ink transition-colors"
              aria-label="Normas"
            >
              <ScrollText className="w-4 h-4" />
            </Link>
            <Link
              href="/notificaciones"
              className="relative flex items-center justify-center w-8 h-8 text-ink-muted hover:text-ink transition-colors"
              aria-label="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 font-marcador text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            {isAdmin && (
              <Link
                href="/admin/usuarios"
                className="flex items-center justify-center w-8 h-8 text-ink-muted hover:text-ink transition-colors"
                aria-label="Administración"
              >
                <Shield className="w-4 h-4" />
              </Link>
            )}
            <Link
              href="/mi-cuenta"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-ink text-cream"
              aria-label="Mi cuenta"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Fixed bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border [transform:translateZ(0)]">
        <div className="max-w-[680px] mx-auto flex pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 ${
                  active ? "text-red" : "text-ink-faint"
                }`}
              >
                <span className="relative">
                  <item.icon size={20} />
                </span>
                <span className="font-marcador text-[10px] font-bold uppercase tracking-wide">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
