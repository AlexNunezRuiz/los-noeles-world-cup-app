import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { headers } from "next/headers";
import { readAuthContext } from "@/lib/auth/request-context";
import { DEFAULT_APP_ROUTE } from "@/lib/navigation/default-route";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authContext = readAuthContext(headers());
  let userId = authContext.userId;
  let isAdmin = authContext.isAdmin;
  let supabase: ReturnType<typeof createClient> | null = null;

  function getSupabase() {
    supabase ??= createClient();
    return supabase;
  }

  if (!userId) {
    const { data: { user } } = await getSupabase().auth.getUser();
    userId = user?.id ?? null;
  }

  if (userId && !isAdmin) {
    const { data: profile } = await getSupabase()
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();
    isAdmin = profile?.is_admin ?? false;
  }

  if (!userId) redirect("/login");
  if (!isAdmin) redirect(DEFAULT_APP_ROUTE);

  return <AdminShell>{children}</AdminShell>;
}
