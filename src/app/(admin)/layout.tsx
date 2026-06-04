import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { headers } from "next/headers";
import { readAuthContext } from "@/lib/auth/request-context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authContext = readAuthContext(headers());
  let userId = authContext.userId;
  let isAdmin = authContext.isAdmin;

  if (!userId) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .single();
      isAdmin = profile?.is_admin ?? false;
    }
  }

  if (!userId) redirect("/login");
  if (!isAdmin) redirect("/dashboard");

  return <AdminShell>{children}</AdminShell>;
}
