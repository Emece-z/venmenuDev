"use server";

import { revalidatePath } from "next/cache";
import { getOwnerContext } from "@/lib/owner";
import type { SettingsState } from "./state";

const LIMITS = {
  name: 120,
  description: 600,
  address: 200,
  phone: 40,
  whatsapp: 40,
  instagram: 100,
} as const;

function text(formData: FormData, key: string, max: number): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v ? v.slice(0, max) : null;
}

// El dueño edita nombre, moneda y datos públicos de su propio local. RLS
// (`locals_update`) ya limita a `owns_local`; el `.eq("id", …)` es defensa extra.
// El slug y el estado del local los sigue manejando solo el super-admin.
export async function updateLocalSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, profile } = await getOwnerContext();

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
    })
    .eq("id", profile.local_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  return { ok: true, error: null };
}
