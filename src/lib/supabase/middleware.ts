import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  clearAuthContextHeaders,
  writeAuthContextHeaders,
} from "@/lib/auth/request-context";

const MOCK =
  process.env.NEXT_PUBLIC_MOCK === "true" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isProtectedAppRoute(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/predicciones") ||
    pathname.startsWith("/ranking") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/mi-cuenta") ||
    pathname.startsWith("/notificaciones") ||
    pathname.startsWith("/porra") ||
    pathname.startsWith("/resultados") ||
    pathname.startsWith("/jugador")
  );
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  clearAuthContextHeaders(requestHeaders);

  if (MOCK) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  function refreshResponse() {
    const nextResponse = NextResponse.next({ request: { headers: requestHeaders } });
    for (const cookie of response.cookies.getAll()) {
      nextResponse.cookies.set(cookie);
    }
    response = nextResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          refreshResponse();
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          refreshResponse();
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const isAppRoute = isProtectedAppRoute(pathname);
  const isAdminRoute = pathname.startsWith("/admin");

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  let userId = claimsData?.claims?.sub ?? null;

  if (!userId && claimsError) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  let isAdmin = false;
  if (userId && isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();
    isAdmin = profile?.is_admin ?? false;
  }

  if (userId) {
    writeAuthContextHeaders(requestHeaders, { userId, isAdmin });
    refreshResponse();
  }

  if (!userId && (isAppRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && userId && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
