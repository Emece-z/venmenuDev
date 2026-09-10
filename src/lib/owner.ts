import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Contexto común para todas las pantallas y acciones del panel del dueño:
// perfil, cliente supabase, local y su menú principal (uno por local en el MVP).
export async function getOwnerContext() {
  const profile = await requireOwner();
  const supabase = await createClient();

  const { data: local } = await supabase
    .from("locals")
    .select("id, name, slug, currency, status")
    .eq("id", profile.local_id)
    .single();

  const { data: menu } = await supabase
    .from("menus")
    .select("id, name, is_published")
    .eq("local_id", profile.local_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return {
    profile,
    supabase,
    local,
    menu,
    currency: local?.currency ?? "CLP",
  };
}
