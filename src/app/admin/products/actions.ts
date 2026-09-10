"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOwnerContext } from "@/lib/owner";
import { parsePriceToCents } from "@/lib/money";
import type { Database } from "@/lib/types";
import {
  PRODUCT_IMAGES_BUCKET,
  productImagePath,
  validateImageFile,
} from "@/lib/images";

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

// Sube (o reemplaza) la imagen del producto y devuelve su URL pública.
// El `?t=` evita que el navegador/CDN sirva la versión anterior tras un reemplazo.
async function uploadProductImage(
  supabase: SupabaseClient<Database>,
  localId: string,
  productId: string,
  file: File,
): Promise<string> {
  const path = productImagePath(localId, productId);
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);

  const { data } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

async function removeProductImage(
  supabase: SupabaseClient<Database>,
  localId: string,
  productId: string,
): Promise<void> {
  // Best-effort: si falla el borrado del objeto no bloqueamos la operación.
  await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove([productImagePath(localId, productId)]);
}

export async function createProduct(formData: FormData) {
  const { supabase, menu, profile, currency } = await getOwnerContext();
  if (!menu) throw new Error("El local no tiene menú");

  const values = readForm(formData, currency);
  const image = validateImageFile(formData.get("image"));

  const { data: created, error } = await supabase
    .from("products")
    .insert({
      menu_id: menu.id,
      local_id: profile.local_id,
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
      ...values,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (image && created) {
    const url = await uploadProductImage(
      supabase,
      profile.local_id,
      created.id,
      image,
    );
    await supabase
      .from("products")
      .update({ image_url: url })
      .eq("id", created.id)
      .eq("local_id", profile.local_id);
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

export async function updateProduct(formData: FormData) {
  const { supabase, profile, currency } = await getOwnerContext();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Falta id");

  const values = readForm(formData, currency);
  const image = validateImageFile(formData.get("image"));
  const removeImage = formData.get("remove_image") === "on";

  let imageUrl: string | null | undefined;
  if (image) {
    imageUrl = await uploadProductImage(supabase, profile.local_id, id, image);
  } else if (removeImage) {
    await removeProductImage(supabase, profile.local_id, id);
    imageUrl = null;
  }

  const { error } = await supabase
    .from("products")
    .update({
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
      ...values,
      ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
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

  await removeProductImage(supabase, profile.local_id, id);

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("local_id", profile.local_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
  revalidatePath("/admin");
}
