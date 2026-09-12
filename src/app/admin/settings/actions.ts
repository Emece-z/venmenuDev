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
import type { SettingsState } from "./state";

const LIMITS = {
  name: 120,
  description: 600,
  address: 200,
  phone: 40,
  whatsapp: 40,
  instagram: 100,
  google_review_url: 300,
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

  const { error } = await supabase
    .from("locals")
    .update({
      name,
      currency,
      description: text(formData, "description", LIMITS.description),
      address: text(formData, "address", LIMITS.address),
      phone: text(formData, "phone", LIMITS.phone),
      whatsapp: text(formData, "whatsapp", LIMITS.whatsapp),
      instagram: text(formData, "instagram", LIMITS.instagram),
      hours: hasMeaningfulHours(week) ? week : null,
      google_reviews_enabled: googleReviewsEnabled,
      google_review_url: googleReviewUrl,
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
