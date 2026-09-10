-- ============================================================
-- 0002_rls.sql — Row Level Security (aislamiento entre locales)
-- ============================================================
-- Roles de Postgres que usa Supabase:
--   anon          -> visitante sin login (página pública del menú)
--   authenticated -> usuario logueado (dueño de local o super-admin)
--   service_role  -> backend con la service key; IGNORA RLS (tareas de plataforma)
--
-- Estrategia: cada tabla con RLS activo. Funciones auxiliares SECURITY DEFINER
-- leen `profiles` sin disparar RLS (evita recursión infinita en las políticas).
-- ============================================================

-- ---------- Funciones auxiliares ----------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  );
$$;

create or replace function public.owns_local(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.local_id = target
  );
$$;

grant execute on function public.is_super_admin()      to anon, authenticated;
grant execute on function public.owns_local(uuid)      to anon, authenticated;

-- ---------- Grants de tabla (RLS se aplica ENCIMA de estos) ----------
grant usage on schema public to anon, authenticated;

-- El visitante anónimo solo lee las 4 tablas de cara al público.
grant select on public.locals, public.menus, public.categories, public.products to anon;

-- El usuario logueado puede intentar DML en todo; las políticas filtran fila a fila.
grant select, insert, update, delete on
  public.locals, public.profiles, public.menus, public.categories,
  public.products, public.subscriptions
  to authenticated;

-- ---------- Activar RLS ----------
alter table public.locals        enable row level security;
alter table public.profiles      enable row level security;
alter table public.menus         enable row level security;
alter table public.categories    enable row level security;
alter table public.products      enable row level security;
alter table public.subscriptions enable row level security;

-- ============================================================
-- profiles
-- ============================================================
-- Cada quien ve su propia fila; el super-admin ve todas.
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin());

-- Solo puede editar su propia fila. Que NO pueda cambiarse `role` ni
-- `local_id` (escalada de privilegios) lo garantiza el trigger
-- guard_profile_privileges (0003_triggers.sql).
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- locals
-- ============================================================
-- SELECT: público si está activo; el owner ve el suyo aunque esté suspendido;
-- el super-admin ve todos.
create policy locals_select on public.locals
  for select to anon, authenticated
  using (
    status = 'active'
    or public.owns_local(id)
    or public.is_super_admin()
  );

-- INSERT / DELETE de locales: solo super-admin.
create policy locals_insert_admin on public.locals
  for insert to authenticated
  with check (public.is_super_admin());

create policy locals_delete_admin on public.locals
  for delete to authenticated
  using (public.is_super_admin());

-- UPDATE: el owner puede editar su local (nombre, moneda…), el super-admin
-- cualquiera. El cambio de `status` lo bloquea el trigger guard_local_status
-- salvo que seas super-admin.
create policy locals_update on public.locals
  for update to authenticated
  using (public.owns_local(id) or public.is_super_admin())
  with check (public.owns_local(id) or public.is_super_admin());

-- Impide que un owner reactive/suspenda su propio local editando `status`.
create or replace function public.guard_local_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null => operación de plataforma (SQL Editor / service_role),
  -- se permite. El candado aplica solo a un owner logueado.
  if new.status is distinct from old.status
     and auth.uid() is not null
     and not public.is_super_admin() then
    raise exception 'Solo el super-admin puede cambiar el estado del local';
  end if;
  return new;
end;
$$;

create trigger trg_guard_local_status
  before update on public.locals
  for each row execute function public.guard_local_status();

-- ============================================================
-- menus
-- ============================================================
create policy menus_select on public.menus
  for select to anon, authenticated
  using (
    public.owns_local(local_id)
    or public.is_super_admin()
    or (
      is_published
      and exists (
        select 1 from public.locals l
        where l.id = menus.local_id and l.status = 'active'
      )
    )
  );

create policy menus_write on public.menus
  for all to authenticated
  using (public.owns_local(local_id) or public.is_super_admin())
  with check (public.owns_local(local_id) or public.is_super_admin());

-- ============================================================
-- categories
-- ============================================================
create policy categories_select on public.categories
  for select to anon, authenticated
  using (
    public.owns_local(local_id)
    or public.is_super_admin()
    or exists (
      select 1
      from public.menus m
      join public.locals l on l.id = m.local_id
      where m.id = categories.menu_id
        and m.is_published
        and l.status = 'active'
    )
  );

create policy categories_write on public.categories
  for all to authenticated
  using (public.owns_local(local_id) or public.is_super_admin())
  with check (public.owns_local(local_id) or public.is_super_admin());

-- ============================================================
-- products
-- ============================================================
create policy products_select on public.products
  for select to anon, authenticated
  using (
    public.owns_local(local_id)
    or public.is_super_admin()
    or (
      is_available
      and exists (
        select 1
        from public.menus m
        join public.locals l on l.id = m.local_id
        where m.id = products.menu_id
          and m.is_published
          and l.status = 'active'
      )
    )
  );

create policy products_write on public.products
  for all to authenticated
  using (public.owns_local(local_id) or public.is_super_admin())
  with check (public.owns_local(local_id) or public.is_super_admin());

-- ============================================================
-- subscriptions
-- ============================================================
-- El owner ve la suya (solo lectura); el super-admin lee y escribe todas.
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (public.owns_local(local_id) or public.is_super_admin());

create policy subscriptions_write_admin on public.subscriptions
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
