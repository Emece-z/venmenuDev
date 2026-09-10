"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlan, SUBSCRIPTION_STATUSES } from "@/lib/plans";
import type { LocalStatus, SubscriptionStatus } from "@/lib/types";

// Mismo formato que exige el CHECK `locals_slug_format` en la base.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Alta completa de un local + su usuario dueño, sin tocar Supabase a mano.
// Usa el cliente service_role porque:
//  - crear el login necesita la Admin API (auth.admin.createUser)
//  - asignar local_id al perfil de OTRO usuario lo bloquea RLS para el super-admin
// Los triggers de la base crean solos el menú y la suscripción del local.
export async function createLocalWithOwner(formData: FormData) {
  await requireSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const currency =
    String(formData.get("currency") ?? "")
      .trim()
      .toUpperCase() || "CLP";
  const plan = normalizePlan(formData.get("plan"));
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim() || null;

  if (!name) throw new Error("El nombre del local es obligatorio");
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      "El slug debe ser minúsculas, números y guiones (ej. cafe-central)",
    );
  }
  if (!email) throw new Error("El email del dueño es obligatorio");
  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }

  const admin = createAdminClient();

  // 1. Crear el local. Trigger handle_new_local -> menú + suscripción (trialing).
  const { data: local, error: localErr } = await admin
    .from("locals")
    .insert({ name, slug, currency })
    .select("id")
    .single();
  if (localErr || !local) {
    if (localErr?.code === "23505") {
      throw new Error(`Ya existe un local con el slug "${slug}"`);
    }
    throw new Error(localErr?.message ?? "No se pudo crear el local");
  }

  // 1b. Ajustar el plan de la suscripción recién creada por el trigger.
  await admin
    .from("subscriptions")
    .update({ plan })
    .eq("local_id", local.id);

  // 2. Crear el usuario dueño (login inmediato, sin verificación de mail).
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (userErr || !created?.user) {
    await admin.from("locals").delete().eq("id", local.id); // rollback
    throw new Error(userErr?.message ?? "No se pudo crear el usuario dueño");
  }

  // 3. Vincular el perfil (lo creó el trigger handle_new_user) al local.
  const { error: profErr } = await admin
    .from("profiles")
    .upsert(
      { id: created.user.id, role: "owner", local_id: local.id, full_name: fullName },
      { onConflict: "id" },
    );
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id); // rollback
    await admin.from("locals").delete().eq("id", local.id);
    throw new Error(profErr.message);
  }

  revalidatePath("/super-admin");
}

// Editar los datos del local. Cambiar el slug rompe los QR/NFC ya impresos
// que apuntan al slug anterior (el aviso está en la UI).
export async function updateLocal(formData: FormData) {
  await requireSuperAdmin();

  const localId = String(formData.get("localId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const currency =
    String(formData.get("currency") ?? "")
      .trim()
      .toUpperCase() || "CLP";

  if (!localId) throw new Error("Falta el local");
  if (!name) throw new Error("El nombre es obligatorio");
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      "El slug debe ser minúsculas, números y guiones (ej. cafe-central)",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("locals")
    .update({ name, slug, currency })
    .eq("id", localId);
  if (error) {
    if (error.code === "23505") {
      throw new Error(`Ya existe otro local con el slug "${slug}"`);
    }
    throw new Error(error.message);
  }

  revalidatePath("/super-admin");
  revalidatePath(`/m/${slug}`);
}

// Ajustar plan y estado de la suscripción a mano (hasta integrar cobros).
export async function updateSubscription(formData: FormData) {
  await requireSuperAdmin();

  const localId = String(formData.get("localId") ?? "");
  const plan = normalizePlan(formData.get("plan"));
  const status = String(formData.get("status") ?? "") as SubscriptionStatus;

  if (!localId) throw new Error("Falta el local");
  if (!SUBSCRIPTION_STATUSES.includes(status)) {
    throw new Error("Estado de suscripción inválido");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ plan, status })
    .eq("local_id", localId);
  if (error) throw new Error(error.message);

  revalidatePath("/super-admin");
}

// Activar / suspender el acceso público de un local.
// Cuando integremos pagos, este mismo cambio lo hará un job automático al
// detectar mensualidad impaga; por ahora es manual desde el panel.
export async function setLocalStatus(formData: FormData) {
  await requireSuperAdmin();

  const localId = String(formData.get("localId") ?? "");
  const next = String(formData.get("status") ?? "") as LocalStatus;

  if (!localId || (next !== "active" && next !== "suspended")) {
    throw new Error("Parámetros inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("locals")
    .update({ status: next })
    .eq("id", localId);

  if (error) throw new Error(error.message);

  revalidatePath("/super-admin");
}
