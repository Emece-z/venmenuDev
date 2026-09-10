import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/lib/types";

// En las rutas privadas: refresca la sesión de Supabase y aplica el control
// de acceso por área. En las rutas públicas no hace nada. Se invoca desde
// src/middleware.ts.
//
// Reglas:
//  - /admin/**        -> requiere sesión con rol 'owner'
//  - /super-admin/**  -> requiere sesión con rol 'super_admin'
//  - todo lo demás    -> público (incluida la página del menú /m/[slug])
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;
  const needsOwner = pathname.startsWith("/admin");
  const needsSuperAdmin = pathname.startsWith("/super-admin");

  // Ruta pública (incluye el menú /m/[slug]): no tocamos Supabase para no
  // agregar latencia a la página que ve el cliente en la mesa.
  if (!needsOwner && !needsSuperAdmin) {
    return response;
  }

  const supabase = createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Importante: getUser() revalida el token contra Supabase (no confía en la
  // cookie sin verificar).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo(request, "/login", pathname);
  }

  // El rol vive en la tabla `profiles` (1:1 con auth.users).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, local_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return redirectTo(request, "/login", pathname);
  }

  if (needsSuperAdmin && profile.role !== "super_admin") {
    return redirectTo(request, "/admin", null);
  }

  if (needsOwner && profile.role !== "owner") {
    // Un super-admin que entra a /admin se va a su panel.
    return redirectTo(request, "/super-admin", null);
  }

  return response;
}

function redirectTo(request: NextRequest, path: string, from: string | null) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  if (from) url.searchParams.set("next", from);
  return NextResponse.redirect(url);
}
