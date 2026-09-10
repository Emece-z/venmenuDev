-- ============================================================
-- 0004_storage.sql — Bucket de imágenes de producto
-- ============================================================
-- Bucket PÚBLICO (el menú se ve sin login). La seguridad está en las
-- políticas de escritura: cada dueño solo puede tocar objetos cuya primera
-- carpeta sea el id de SU local. Ruta de cada imagen: `<local_id>/<product_id>`.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  3145728, -- 3 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública de todo el bucket (lo consume la página /m/<slug>).
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

-- El dueño escribe solo dentro de la carpeta de su local.
-- (storage.foldername(name))[1] = primer segmento de la ruta = <local_id>.
drop policy if exists "product_images_owner_insert" on storage.objects;
create policy "product_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.owns_local(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.owns_local(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'product-images'
    and public.owns_local(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.owns_local(((storage.foldername(name))[1])::uuid)
  );
