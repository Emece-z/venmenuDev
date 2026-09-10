"use server";

import { revalidatePath } from "next/cache";
import { getOwnerContext } from "@/lib/owner";

// El dueño edita nombre y moneda de su propio local. RLS (`locals_update`) ya
// limita a `owns_local`; el `.eq("id", …)` es defensa extra. El slug y el estado
// del local los sigue manejando solo el super-admin.
export async function updateLocalSettings(formData: FormData) {
  const { supabase, profile } = await getOwnerContext();

  const name = String(formData.get("name") ?? "").trim();
  const currency =
    String(formData.get("currency") ?? "")
      .trim()
      .toUpperCase() || "CLP";

  if (!name) throw new Error("El nombre es obligatorio");

  // ISO 4217: 3 letras y que `Intl` la reconozca (si no, rompería el formateo
  // de precios en la página pública).
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("La moneda debe ser un código ISO de 3 letras (ej. CLP, USD)");
  }
  try {
    new Intl.NumberFormat("es-CL", { style: "currency", currency }).format(1);
  } catch {
    throw new Error(`Código de moneda no reconocido: ${currency}`);
  }

  const { error } = await supabase
    .from("locals")
    .update({ name, currency })
    .eq("id", profile.local_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
}
