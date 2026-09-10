"use server";

import { revalidatePath } from "next/cache";
import { getOwnerContext } from "@/lib/owner";

// Publicar / ocultar el menú completo. Al ocultarlo, la página pública
// /m/<slug> deja de mostrar productos (RLS filtra por is_published).
export async function toggleMenuPublished(formData: FormData) {
  const { supabase, menu, profile } = await getOwnerContext();
  if (!menu) throw new Error("El local no tiene menú");

  const next = String(formData.get("next")) === "true";
  const { error } = await supabase
    .from("menus")
    .update({ is_published: next })
    .eq("id", menu.id)
    .eq("local_id", profile.local_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
}
