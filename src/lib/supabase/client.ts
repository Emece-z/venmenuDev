"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/lib/types";

// Cliente para componentes que corren en el navegador (formularios de login,
// acciones interactivas del panel). Usa la anon key; la seguridad real la
// aplica RLS en Postgres.
export function createClient() {
  return createBrowserClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
  );
}
