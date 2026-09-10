import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/lib/types";

// Cliente para Server Components, Route Handlers y Server Actions.
// Lee/escribe la sesión desde las cookies de la request.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` puede llamarse desde un Server Component (donde las
            // cookies son de solo lectura). El refresh real de sesión lo hace
            // el middleware, así que aquí se puede ignorar sin problema.
          }
        },
      },
    },
  );
}
