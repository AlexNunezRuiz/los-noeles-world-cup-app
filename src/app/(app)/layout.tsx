import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { headers } from "next/headers";
import { readAuthContext } from "@/lib/auth/request-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <>
      <Navbar isAdmin={isAdmin} userId={userId} />
      <main className="mx-auto max-w-[680px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(4rem+env(safe-area-inset-top))]">
        {children}
      </main>
    </>
  );
}
