"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, CalendarDays, Activity, Trophy, MessageCircle, User, Shield, Banknote, ScrollText } from "lucide-react";
import { Emblem } from "@/components/ui/emblem";

const navItems = [
  { href: "/porra", label: "Porra", icon: ClipboardList },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/resultados", label: "Resultados", icon: Activity },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/bote", label: "Bote", icon: Banknote },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

export function Navbar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-surface border-b border-border">
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border">
        <div className="max-w-[680px] mx-auto flex pt-2 pb-2">
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
                <item.icon size={20} />
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
