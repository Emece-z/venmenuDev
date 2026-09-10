import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env, serviceRoleKey } from "@/lib/env";
import type { Database } from "@/lib/types";

// Cliente con service_role: BYPASSA RLS. Uso exclusivo del servidor para
// tareas de plataforma (super-admin de sistema, y más adelante el job que
// suspende locales por falta de pago). Nunca importar desde el navegador
// ni usarlo para servir la página pública.
export function createAdminClient() {
  return createSupabaseClient<Database>(env.SUPABASE_URL, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
