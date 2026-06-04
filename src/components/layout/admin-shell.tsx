"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Megaphone,
  MessageCircle,
  Menu,
  Settings,
  Trophy,
  UserCog,
  Users,
  X,
} from "lucide-react";

const adminNav = [
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/resultados", label: "Resultados", icon: ClipboardList },
  { href: "/admin/resultados/premios", label: "Premios", icon: Trophy },
  { href: "/admin/jugadores", label: "Jugadores", icon: UserCog },
  { href: "/admin/mensajes", label: "Mensajes", icon: Megaphone },
  { href: "/admin/chat", label: "Chat", icon: MessageCircle },
  { href: "/admin/configuracion", label: "Config", icon: Settings },
];

function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  return (
    <div className="flex flex-col gap-1">
      {adminNav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 font-sans text-sm font-medium transition-colors ${
              active
                ? "bg-red text-white shadow-sm"
                : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-surface px-4 py-5 md:flex md:flex-col">
        <Link
          href="/dashboard"
          className="mb-6 flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la app
        </Link>

        <div className="mb-4 px-2">
          <p className="font-marcador text-xl font-bold uppercase tracking-wide text-ink">
            Panel Admin
          </p>
          <p className="mt-1 text-xs text-ink-muted">Gestion de la porra</p>
        </div>

        <AdminNavLinks />
      </aside>

      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-sunken"
          aria-label="Abrir menu de administracion"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-marcador text-base font-bold uppercase tracking-wide text-ink">
          Panel Admin
        </span>
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          aria-label="Volver a la app"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/35"
            aria-label="Cerrar menu de administracion"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative flex h-full w-[min(82vw,320px)] flex-col border-r border-border bg-surface p-4 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-marcador text-lg font-bold uppercase tracking-wide text-ink">
                  Panel Admin
                </p>
                <p className="text-xs text-ink-muted">Gestion de la porra</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                aria-label="Cerrar menu de administracion"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AdminNavLinks onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <main className="pt-14 md:pl-64 md:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
