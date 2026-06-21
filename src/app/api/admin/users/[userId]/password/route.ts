import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { resetUserPasswordManually } from "@/lib/admin/password-reset";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile, error: profileError } = user
    ? await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single()
    : { data: null, error: null };

  if (profileError) {
    return NextResponse.json(
      { error: "No se pudo verificar el administrador." },
      { status: 403 }
    );
  }

  if (!user) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  if (profile?.is_admin !== true) {
    return NextResponse.json(
      { error: "Solo un administrador puede cambiar contrasenas." },
      { status: 403 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor." },
      { status: 500 }
    );
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const result = await resetUserPasswordManually({
    actorIsAdmin: profile?.is_admin === true,
    actorUserId: user?.id,
    targetUserId: params.userId,
    password,
    updateUserPassword: async (userId, nextPassword) => {
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        password: nextPassword,
      });
      return { error };
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
