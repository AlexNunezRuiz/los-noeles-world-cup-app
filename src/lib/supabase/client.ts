import { createBrowserClient } from "@supabase/ssr";
import { createMockClient } from "./mock/client";

const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

export function createClient() {
  if (MOCK) return createMockClient();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
