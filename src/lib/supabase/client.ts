import { createBrowserClient } from "@supabase/ssr";
import { createMockClient } from "./mock/client";

const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

type SupabaseClient = ReturnType<typeof createBrowserClient>;

// Cliente único por sesión de navegador. Antes se creaba una instancia nueva
// en cada render de cada página: renders de más y memoización rota (los
// useCallback que dependían de `supabase` se recreaban en cada tecla).
let cached: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (cached) return cached;

  cached = MOCK
    ? (createMockClient() as SupabaseClient)
    : createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

  return cached;
}
