// Imágenes de producto en Supabase Storage.
// Bucket público (el menú es público): la seguridad de escritura la dan las
// políticas de `storage.objects` (ver supabase/migrations/0004_storage.sql):
// cualquiera lee, pero solo el dueño del local escribe en su carpeta.

export const PRODUCT_IMAGES_BUCKET = "product-images";

// Avatar/logo del local. Mismo criterio, pero acá también puede escribir el
// super-admin (no solo el dueño) — ver políticas en 0008_local_avatar.sql.
export const LOCAL_AVATARS_BUCKET = "local-avatars";

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// Clave determinística: 1 objeto por producto, sin extensión (el Content-Type
// se guarda como metadato al subir). Así el borrado es una sola clave conocida.
export function productImagePath(localId: string, productId: string): string {
  return `${localId}/${productId}`;
}

export function localAvatarPath(localId: string): string {
  return `${localId}/avatar`;
}

// Banner del encabezado del menú público. Mismo bucket que el avatar.
export function localBannerPath(localId: string): string {
  return `${localId}/banner`;
}

// Valida un File recibido en un Server Action. Devuelve null si no hay archivo
// (campo vacío); lanza si el archivo no cumple.
export function validateImageFile(value: FormDataEntryValue | null): File | null {
  if (!(value instanceof File) || value.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(value.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new Error("La imagen debe ser JPG, PNG o WebP");
  }
  if (value.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen no puede superar los 3 MB");
  }
  return value;
}
