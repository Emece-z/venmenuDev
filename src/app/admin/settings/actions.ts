"use server";

import { revalidatePath } from "next/cache";
import { getOwnerContext } from "@/lib/owner";
import { readWeekHoursFromForm, hasMeaningfulHours } from "@/lib/hours";
import { validateImageFile } from "@/lib/images";
import {
  uploadLocalAvatar,
  removeLocalAvatar,
  uploadLocalBanner,
  removeLocalBanner,
} from "@/lib/local-media";
import { isHexColor } from "@/lib/theme";
import type { FormState } from "@/lib/form-state";
import type { SettingsState } from "./state";

const LIMITS = {
  name: 120,
  description: 600,
  address: 200,
  address_label: 80,
  phone: 40,
  whatsapp: 40,
  instagram: 100,
  google_review_url: 300,
  delivery_url: 300,
} as const;

function text(formData: FormData, key: string, max: number): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v ? v.slice(0, max) : null;
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// El dueño edita nombre, moneda y datos públicos de su propio local. RLS
// (`locals_update`) ya limita a `owns_local`; el `.eq("id", …)` es defensa extra.
// El slug y el estado del local los sigue manejando solo el super-admin.
export async function updateLocalSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, profile, local } = await getOwnerContext();

  const name = text(formData, "name", LIMITS.name);
  if (!name) return { ok: false, error: "El nombre es obligatorio" };

  const currency =
    String(formData.get("currency") ?? "")
      .trim()
      .toUpperCase() || "CLP";
  // ISO 4217: 3 letras y que `Intl` la reconozca (si no, rompería el formateo
  // de precios en la página pública).
  if (!/^[A-Z]{3}$/.test(currency)) {
    return {
      ok: false,
      error: "La moneda debe ser un código ISO de 3 letras (ej. CLP, USD)",
    };
  }
  try {
    new Intl.NumberFormat("es-CL", { style: "currency", currency }).format(1);
  } catch {
    return { ok: false, error: `Código de moneda no reconocido: ${currency}` };
  }

  const week = readWeekHoursFromForm(formData);

  let avatar: File | null;
  try {
    avatar = validateImageFile(formData.get("avatar"));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Imagen inválida" };
  }
  const removeAvatar = formData.get("remove_avatar") === "on";

  let avatarUrl: string | null | undefined;
  try {
    if (avatar) {
      avatarUrl = await uploadLocalAvatar(supabase, profile.local_id, avatar);
    } else if (removeAvatar) {
      await removeLocalAvatar(supabase, profile.local_id);
      avatarUrl = null;
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo actualizar el avatar" };
  }

  let banner: File | null;
  try {
    banner = validateImageFile(formData.get("banner"));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Imagen inválida" };
  }
  const removeBanner = formData.get("remove_banner") === "on";

  let bannerUrl: string | null | undefined;
  try {
    if (banner) {
      bannerUrl = await uploadLocalBanner(supabase, profile.local_id, banner);
    } else if (removeBanner) {
      await removeLocalBanner(supabase, profile.local_id);
      bannerUrl = null;
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo actualizar el banner" };
  }

  // Paleta: si vienen los 3 colores y son hex válidos, se guardan; si el
  // form no los manda (no debería pasar, están siempre presentes), se dejan
  // como estaban.
  const themeBg = String(formData.get("theme_bg") ?? "");
  const themeText = String(formData.get("theme_text") ?? "");
  const themeAccent = String(formData.get("theme_accent") ?? "");
  const hasTheme = themeBg || themeText || themeAccent;
  if (hasTheme && !(isHexColor(themeBg) && isHexColor(themeText) && isHexColor(themeAccent))) {
    return { ok: false, error: "Colores inválidos" };
  }

  const googleReviewsEnabled = formData.get("google_reviews_enabled") === "on";
  // El valor se guarda tal cual se envíe, se muestre o no el checkbox: así
  // destildarlo nunca borra el link ya cargado, solo lo oculta en /m/[slug]
  // (que ya filtra por `google_reviews_enabled && google_review_url`).
  const googleReviewUrl = text(
    formData,
    "google_review_url",
    LIMITS.google_review_url,
  );
  if (googleReviewsEnabled && !(googleReviewUrl && isHttpUrl(googleReviewUrl))) {
    return {
      ok: false,
      error:
        "Para mostrar el link de reseñas ingresá una URL válida (la que te da tu perfil de Google Business)",
    };
  }

  const whatsapp = text(formData, "whatsapp", LIMITS.whatsapp);

  const deliveryOwnEnabled = formData.get("delivery_own_enabled") === "on";
  const deliveryOwnWhatsapp = text(formData, "delivery_own_whatsapp", LIMITS.whatsapp);
  if (deliveryOwnEnabled && !deliveryOwnWhatsapp && !whatsapp) {
    return {
      ok: false,
      error:
        "Para el delivery propio agregá un WhatsApp (acá o en el de arriba, en Página pública)",
    };
  }

  const deliveryUberUrl = text(formData, "delivery_uber_url", LIMITS.delivery_url);
  const deliveryRappiUrl = text(formData, "delivery_rappi_url", LIMITS.delivery_url);
  const deliveryPedidosyaUrl = text(
    formData,
    "delivery_pedidosya_url",
    LIMITS.delivery_url,
  );
  for (const [label, v] of [
    ["Uber Eats", deliveryUberUrl],
    ["Rappi", deliveryRappiUrl],
    ["PedidosYa", deliveryPedidosyaUrl],
  ] as const) {
    if (v && !isHttpUrl(v)) {
      return { ok: false, error: `El link de ${label} no es una URL válida` };
    }
  }

  const { error } = await supabase
    .from("locals")
    .update({
      name,
      currency,
      description: text(formData, "description", LIMITS.description),
      phone: text(formData, "phone", LIMITS.phone),
      whatsapp,
      instagram: text(formData, "instagram", LIMITS.instagram),
      hours: hasMeaningfulHours(week) ? week : null,
      google_reviews_enabled: googleReviewsEnabled,
      google_review_url: googleReviewUrl,
      delivery_own_enabled: deliveryOwnEnabled,
      delivery_own_whatsapp: deliveryOwnWhatsapp,
      delivery_uber_url: deliveryUberUrl,
      delivery_rappi_url: deliveryRappiUrl,
      delivery_pedidosya_url: deliveryPedidosyaUrl,
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
      ...(bannerUrl !== undefined ? { banner_url: bannerUrl } : {}),
      ...(hasTheme
        ? { theme_bg: themeBg, theme_text: themeText, theme_accent: themeAccent }
        : {}),
    })
    .eq("id", profile.local_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  if (local) revalidatePath(`/m/${local.slug}`);
  return { ok: true, error: null };
}

// ─────────────────────────────────────────────────────────────
// Direcciones (0010): 1 o varias sucursales, en su propia tabla. Mismo
// patrón que CategoriesManager (crear al final + un solo "Guardar" para
// todas las filas), pero sin arrastre: el orden de carga alcanza.
// ─────────────────────────────────────────────────────────────

export async function createAddress(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile, local } = await getOwnerContext();

  const address = text(formData, "address", LIMITS.address);
  if (!address) return { ok: false, error: "La dirección es obligatoria" };
  const label = text(formData, "label", LIMITS.address_label);

  const { count } = await supabase
    .from("local_addresses")
    .select("id", { count: "exact", head: true })
    .eq("local_id", profile.local_id);

  const { error } = await supabase.from("local_addresses").insert({
    local_id: profile.local_id,
    address,
    label,
    sort_order: (count ?? 0) + 1,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  if (local) revalidatePath(`/m/${local.slug}`);
  return { ok: true, error: null };
}

export async function saveAddresses(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile, local } = await getOwnerContext();

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const rawRows = ids.map((id, i) => ({
    id,
    address: text(formData, `address-${id}`, LIMITS.address),
    label: text(formData, `label-${id}`, LIMITS.address_label),
    sort_order: i + 1,
  }));

  if (rawRows.some((r) => !r.address)) {
    return { ok: false, error: "La dirección no puede quedar vacía" };
  }
  const rows = rawRows as { id: string; address: string; label: string | null; sort_order: number }[];

  for (const r of rows) {
    const { error } = await supabase
      .from("local_addresses")
      .update({ address: r.address, label: r.label, sort_order: r.sort_order })
      .eq("id", r.id)
      .eq("local_id", profile.local_id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  if (local) revalidatePath(`/m/${local.slug}`);
  return { ok: true, error: null };
}

// Simple (sin FormState): se dispara desde un botón `formAction` dentro del
// form de "Guardar direcciones", mismo criterio que deleteCategory.
export async function deleteAddress(id: string) {
  const { supabase, profile, local } = await getOwnerContext();
  if (!id) throw new Error("Falta id");

  const { error } = await supabase
    .from("local_addresses")
    .delete()
    .eq("id", id)
    .eq("local_id", profile.local_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
  if (local) revalidatePath(`/m/${local.slug}`);
}
