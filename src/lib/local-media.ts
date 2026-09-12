// Subida/borrado de las imágenes propias del local (avatar y banner). Se usa
// desde /admin/settings (el dueño, su propio local) y desde /super-admin
// (cualquier local) — ambos con el cliente normal: las políticas de
// storage.objects ya dejan escribir tanto al dueño como al super-admin (ver
// supabase/migrations/0008_local_avatar.sql).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import {
  LOCAL_AVATARS_BUCKET,
  localAvatarPath,
  localBannerPath,
} from "@/lib/images";

// El `?t=` evita que el navegador/CDN sirva la versión anterior tras un reemplazo.
async function upload(
  supabase: SupabaseClient<Database>,
  path: string,
  file: File,
): Promise<string> {
  const { error } = await supabase.storage
    .from(LOCAL_AVATARS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);

  const { data } = supabase.storage.from(LOCAL_AVATARS_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

async function remove(supabase: SupabaseClient<Database>, path: string): Promise<void> {
  // Best-effort: si falla el borrado del objeto no bloqueamos la operación.
  await supabase.storage.from(LOCAL_AVATARS_BUCKET).remove([path]);
}

export function uploadLocalAvatar(
  supabase: SupabaseClient<Database>,
  localId: string,
  file: File,
) {
  return upload(supabase, localAvatarPath(localId), file);
}

export function removeLocalAvatar(supabase: SupabaseClient<Database>, localId: string) {
  return remove(supabase, localAvatarPath(localId));
}

export function uploadLocalBanner(
  supabase: SupabaseClient<Database>,
  localId: string,
  file: File,
) {
  return upload(supabase, localBannerPath(localId), file);
}

export function removeLocalBanner(supabase: SupabaseClient<Database>, localId: string) {
  return remove(supabase, localBannerPath(localId));
}
