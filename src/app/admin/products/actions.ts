"use server";

import { revalidatePath } from "next/cache";
import { getOwnerContext } from "@/lib/owner";
import { parsePriceToCents } from "@/lib/money";

function readForm(formData: FormData, currency: string) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const isAvailable = formData.get("is_available") === "on";
  const priceCents = parsePriceToCents(
    String(formData.get("price") ?? ""),
    currency,
  );
  if (!name) throw new Error("El nombre es obligatorio");
  return {
    name,
    description: description || null,
    category_id: categoryId,
    is_available: isAvailable,
    price_cents: priceCents,
  };
}

export async function createProduct(formData: FormData) {
  const { supabase, menu, profile, currency } = await getOwnerContext();
  if (!menu) throw new Error("El local no tiene menú");

  const values = readForm(formData, currency);
  const { error } = await supabase.from("products").insert({
    menu_id: menu.id,
    local_id: profile.local_id,
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    ...values,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

export async function updateProduct(formData: FormData) {
  const { supabase, profile, currency } = await getOwnerContext();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Falta id");

  const values = readForm(formData, currency);
  const { error } = await supabase
    .from("products")
    .update({
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
      ...values,
    })
    .eq("id", id)
    .eq("local_id", profile.local_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

// Atajo: activar/desactivar disponibilidad sin abrir el formulario completo.
export async function toggleProductAvailability(formData: FormData) {
  const { supabase, profile } = await getOwnerContext();

  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next")) === "true";
  if (!id) throw new Error("Falta id");

  const { error } = await supabase
    .from("products")
    .update({ is_available: next })
    .eq("id", id)
    .eq("local_id", profile.local_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

export async function deleteProduct(formData: FormData) {
  const { supabase, profile } = await getOwnerContext();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Falta id");

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("local_id", profile.local_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
  revalidatePath("/admin");
}
