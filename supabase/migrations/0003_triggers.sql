-- ============================================================
-- 0003_triggers.sql — Automatismos de provisión y de integridad
-- ============================================================

-- ---------- 1. Crear profile al registrarse un usuario ----------
-- Supabase inserta en auth.users; este trigger crea la fila espejo en
-- public.profiles. Nace como 'owner' sin local; el super-admin (o el futuro
-- flujo de alta) le asigna el local, o lo promueve a super_admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. Provisionar el local recién creado ----------
-- Al crear un local se le crea automáticamente su menú principal y su fila
-- de suscripción (en 'trialing'). Así el resto de la app siempre asume que
-- existen.
create or replace function public.handle_new_local()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.menus (local_id) values (new.id);
  insert into public.subscriptions (local_id) values (new.id);
  return new;
end;
$$;

create trigger on_local_created
  after insert on public.locals
  for each row execute function public.handle_new_local();

-- ---------- 3. Anti escalada de privilegios en profiles ----------
-- Un usuario puede editar su fila (nombre), pero solo el super-admin puede
-- cambiar `role` o `local_id`.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null => la operación no viene de un usuario logueado
  -- (SQL Editor, service_role, jobs). En ese caso se permite: el candado
  -- es solo para que un owner logueado no se auto-promueva.
  if (new.role is distinct from old.role
      or new.local_id is distinct from old.local_id)
     and auth.uid() is not null
     and not public.is_super_admin() then
    raise exception 'No podés modificar rol ni local asignado';
  end if;
  return new;
end;
$$;

create trigger trg_guard_profile_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------- 4. Coherencia producto <-> categoría dentro del mismo local ----------
-- Evita que un owner asigne a su producto una categoría de OTRO local
-- pasando un category_id ajeno en una request cruda.
create or replace function public.check_product_category_local()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.category_id is not null
     and not exists (
       select 1 from public.categories c
       where c.id = new.category_id and c.local_id = new.local_id
     ) then
    raise exception 'La categoría no pertenece al mismo local que el producto';
  end if;
  return new;
end;
$$;

create trigger trg_check_product_category_local
  before insert or update on public.products
  for each row execute function public.check_product_category_local();
