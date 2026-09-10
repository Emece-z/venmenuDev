"use server";

import { revalidatePath } from "next/cache";
import { getOwnerContext } from "@/lib/owner";

// RLS ya garantiza que un dueño solo toque su local; los `.eq("local_id", …)`
// son defensa extra y evitan errores tontos.

// `sort_order` nunca puede quedar por debajo de 1: si llega algo inválido o < 1
// se normaliza a 1.
function readOrder(raw: FormDataEntryValue | null): number {
  const n = Math.trunc(Number(raw ?? 1));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function createCategory(formData: FormData) {
  const { supabase, menu, profile } = await getOwnerContext();
  if (!menu) throw new Error("El local no tiene menú");

  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = readOrder(formData.get("sort_order"));
  if (!name) throw new Error("El nombre es obligatorio");

  const { error } = await supabase.from("categories").insert({
    menu_id: menu.id,
    local_id: profile.local_id,
    name,
    sort_order: sortOrder,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

// Guarda TODAS las categorías de una vez (un solo botón "Guardar" en la UI).
// El formulario manda un `ids` por fila y los campos `name-<id>` / `sort_order-<id>`.
export async function saveCategories(formData: FormData) {
  const { supabase, profile } = await getOwnerContext();

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const rows = ids.map((id) => ({
    id,
    name: String(formData.get(`name-${id}`) ?? "").trim(),
    sort_order: readOrder(formData.get(`sort_order-${id}`)),
  }));

  if (rows.some((r) => !r.name)) {
    throw new Error("El nombre de una categoría no puede quedar vacío");
  }

  for (const r of rows) {
    const { error } = await supabase
      .from("categories")
      .update({ name: r.name, sort_order: r.sort_order })
      .eq("id", r.id)
      .eq("local_id", profile.local_id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

export async function deleteCategory(formData: FormData) {
  const { supabase, profile } = await getOwnerContext();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Falta id");

  // Los productos de esta categoría quedan con category_id = null (FK ON DELETE SET NULL).
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("local_id", profile.local_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}
