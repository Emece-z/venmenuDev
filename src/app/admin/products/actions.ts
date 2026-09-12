"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOwnerContext } from "@/lib/owner";
import { parsePriceToCents } from "@/lib/money";
import type { Database } from "@/lib/types";
import type { FormState } from "@/lib/form-state";
import {
  PRODUCT_IMAGES_BUCKET,
  productImagePath,
  validateImageFile,
} from "@/lib/images";

// Lee y valida los campos comunes. Puede lanzar (precio inválido, nombre
// vacío, imagen inválida) — los callers lo envuelven en try/catch y lo
// convierten en FormState en vez de dejar que reviente la pantalla de Next.
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

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Ocurrió un error inesperado";
}

export async function createProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, menu, profile, currency } = await getOwnerContext();
  if (!menu) return { ok: false, error: "El local no tiene menú" };

  let values: ReturnType<typeof readForm>;
  let image: File | null;
  try {
    values = readForm(formData, currency);
    image = validateImageFile(formData.get("image"));
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }

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
  if (error) return { ok: false, error: error.message };

  if (image && created) {
    try {
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
    } catch (e) {
      // El producto ya se creó; solo la imagen falló. Se avisa pero no se
      // deshace el alta (el dueño puede subirla de nuevo editando el producto).
      revalidatePath("/admin/products");
      revalidatePath("/admin");
      return {
        ok: false,
        error: `El producto se creó, pero la imagen no se pudo subir: ${errorMessage(e)}`,
      };
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { ok: true, error: null };
}

export async function updateProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile, currency } = await getOwnerContext();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Falta id" };

  let values: ReturnType<typeof readForm>;
  let image: File | null;
  try {
    values = readForm(formData, currency);
    image = validateImageFile(formData.get("image"));
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
  const removeImage = formData.get("remove_image") === "on";

  let imageUrl: string | null | undefined;
  try {
    if (image) {
      imageUrl = await uploadProductImage(supabase, profile.local_id, id, image);
    } else if (removeImage) {
      await removeProductImage(supabase, profile.local_id, id);
      imageUrl = null;
    }
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
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
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { ok: true, error: null };
}

// Atajo: activar/desactivar disponibilidad sin abrir el formulario completo.
// Sin FormState: un solo clic, sin campos que puedan fallar validación.
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
