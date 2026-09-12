-- ============================================================
-- 0008_local_avatar.sql — Avatar/logo del local
-- ============================================================
-- Bucket PÚBLICO (se muestra en /m/<slug>). Ruta `<local_id>/avatar`, un solo
-- objeto por local. A diferencia de las fotos de producto, aquí pueden
-- escribir tanto el dueño del local COMO el super-admin (se edita desde
-- ambos paneles).
-- ============================================================

alter table public.locals
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'local-avatars',
  'local-avatars',
  true,
  3145728, -- 3 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "local_avatars_public_read" on storage.objects;
create policy "local_avatars_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'local-avatars');

drop policy if exists "local_avatars_write_insert" on storage.objects;
create policy "local_avatars_write_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'local-avatars'
    and (
      public.owns_local(((storage.foldername(name))[1])::uuid)
      or public.is_super_admin()
    )
  );

drop policy if exists "local_avatars_write_update" on storage.objects;
create policy "local_avatars_write_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'local-avatars'
    and (
      public.owns_local(((storage.foldername(name))[1])::uuid)
      or public.is_super_admin()
    )
  )
  with check (
    bucket_id = 'local-avatars'
    and (
      public.owns_local(((storage.foldername(name))[1])::uuid)
      or public.is_super_admin()
    )
  );

drop policy if exists "local_avatars_write_delete" on storage.objects;
create policy "local_avatars_write_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'local-avatars'
    and (
      public.owns_local(((storage.foldername(name))[1])::uuid)
      or public.is_super_admin()
    )
  );
