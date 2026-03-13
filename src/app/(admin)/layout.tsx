import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Users, ClipboardList, MessageCircle, UserCog, Settings, Trophy, ArrowLeft } from "lucide-react";

const adminNav = [
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/resultados", label: "Resultados", icon: ClipboardList },
  { href: "/admin/resultados/premios", label: "Premios", icon: Trophy },
  { href: "/admin/jugadores", label: "Jugadores", icon: UserCog },
  { href: "/admin/chat", label: "Chat", icon: MessageCircle },
  { href: "/admin/configuracion", label: "Config", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      {/* Admin top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center border-b bg-card/95 backdrop-blur px-4 gap-4">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="font-bold text-primary">Admin Panel</span>
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="pt-14 pb-4">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
