// Subida/borrado del avatar del local. Se usa desde /admin/settings (el
// dueño, su propio local) y desde /super-admin (cualquier local) — ambos con
// el cliente normal: las políticas de storage.objects ya dejan escribir tanto
// al dueño como al super-admin (ver supabase/migrations/0008_local_avatar.sql).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { LOCAL_AVATARS_BUCKET, localAvatarPath } from "@/lib/images";

// Sube (o reemplaza) el avatar y devuelve su URL pública. El `?t=` evita que
// el navegador/CDN sirva la versión anterior tras un reemplazo.
export async function uploadLocalAvatar(
  supabase: SupabaseClient<Database>,
  localId: string,
  file: File,
): Promise<string> {
  const path = localAvatarPath(localId);
  const { error } = await supabase.storage
    .from(LOCAL_AVATARS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);

  const { data } = supabase.storage.from(LOCAL_AVATARS_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function removeLocalAvatar(
  supabase: SupabaseClient<Database>,
  localId: string,
): Promise<void> {
  // Best-effort: si falla el borrado del objeto no bloqueamos la operación.
  await supabase.storage.from(LOCAL_AVATARS_BUCKET).remove([localAvatarPath(localId)]);
}
