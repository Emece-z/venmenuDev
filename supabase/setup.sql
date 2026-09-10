-- ============================================================
-- setup.sql — TODO el esquema en un solo archivo.
-- Pegá este archivo COMPLETO en el SQL Editor de Supabase y dale Run.
-- Equivale a correr, en orden: 0001_init + 0002_rls + 0003_triggers + seed.
-- Es seguro correrlo una sola vez sobre un proyecto nuevo y vacío.
-- ============================================================

-- ###### 0001_init.sql ######
-- ============================================================
-- 0001_init.sql — Esquema base de VenMenu (multi-tenant)
-- ============================================================
-- Modelo: una sola base, esquema compartido, cada fila lleva su
-- `local_id` (el tenant). El aislamiento entre locales se aplica
-- con Row Level Security (ver 0002_rls.sql).
--
-- `gen_random_uuid()` es nativo de Postgres 13+ (Supabase usa 15+),
-- no hace falta habilitar pgcrypto.
-- ============================================================

-- ---------- Enums ----------
create type public.user_role          as enum ('owner', 'super_admin');
create type public.local_status       as enum ('active', 'suspended');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

-- ---------- locals (tenant) ----------
create table public.locals (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  -- slug = identificador en la URL pública /m/<slug>. Inmutable en la práctica.
  slug       text not null unique,
  -- `status` es la llave maestra del acceso público. La cambia el super-admin
  -- (o, más adelante, el job de cobros). Un owner NO puede tocarla (trigger abajo).
  status     public.local_status not null default 'active',
  currency   text not null default 'CLP',
  created_at timestamptz not null default now(),
  constraint locals_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  -- necesario para las FK compuestas (menu_id, local_id) de las tablas hijas
  constraint locals_id_uk unique (id)
);

-- ---------- profiles (1:1 con auth.users) ----------
-- Guarda el rol y, para owners, a qué local pertenecen.
-- La fila la crea automáticamente un trigger al registrarse el usuario
-- (ver 0003_triggers.sql).
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       public.user_role not null default 'owner',
  local_id   uuid references public.locals(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now(),
  -- un super_admin es global: nunca tiene local asignado
  constraint profiles_superadmin_no_local check (role <> 'super_admin' or local_id is null)
);
create index profiles_local_id_idx on public.profiles (local_id);

-- ---------- menus ----------
-- En el MVP hay un menú por local (se crea solo al crear el local).
-- La tabla existe para permitir varios a futuro (ej. almuerzo / cena).
create table public.menus (
  id           uuid primary key default gen_random_uuid(),
  local_id     uuid not null references public.locals(id) on delete cascade,
  name         text not null default 'Menú principal',
  -- publicar / despublicar el menú completo
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  -- permite que las hijas referencien (id, local_id) juntos
  constraint menus_id_local_uk unique (id, local_id)
);
create index menus_local_id_idx on public.menus (local_id);

-- ---------- categories ----------
-- `local_id` está denormalizado (se puede derivar del menú) para que las
-- políticas RLS y los índices sean simples y rápidos. La FK compuesta contra
-- menus(id, local_id) garantiza que nunca quede inconsistente.
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  menu_id    uuid not null,
  local_id   uuid not null,
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  constraint categories_menu_fk
    foreign key (menu_id, local_id) references public.menus (id, local_id) on delete cascade,
  constraint categories_id_local_uk unique (id, local_id)
);
create index categories_menu_id_idx on public.categories (menu_id);

-- ---------- products ----------
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  menu_id     uuid not null,
  local_id    uuid not null,
  -- FK simple: al borrar la categoría, el producto queda sin categoría.
  -- La coherencia de tenant (misma categoría → mismo local) la valida un
  -- trigger en 0003, porque una FK compuesta con ON DELETE SET NULL chocaría
  -- con local_id NOT NULL.
  category_id uuid references public.categories(id) on delete set null,
  name        text not null,
  description text,
  -- Dinero como entero en la unidad menor (para CLP: 1 = 1 peso).
  -- Evita errores de redondeo de float.
  price_cents int  not null default 0 check (price_cents >= 0),
  -- se llena cuando integremos Supabase Storage
  image_url   text,
  is_available boolean not null default true,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint products_menu_fk
    foreign key (menu_id, local_id) references public.menus (id, local_id) on delete cascade
);
create index products_menu_id_idx     on public.products (menu_id);
create index products_category_id_idx on public.products (category_id);

-- ---------- subscriptions (1:1 con local) ----------
-- Todavía sin pasarela de pago. El super-admin ajusta el estado a mano;
-- la fila se crea sola al crear el local.
create table public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  local_id           uuid not null unique references public.locals(id) on delete cascade,
  status             public.subscription_status not null default 'trialing',
  plan               text not null default 'basic',
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ###### 0002_rls.sql ######
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

-- ###### 0003_triggers.sql ######
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

-- ###### seed.sql (datos demo) ######
-- ============================================================
-- seed.sql — Datos de demo (correr una sola vez, tras las migraciones)
-- ============================================================
-- Crea un local demo con su menú, categorías y productos.
-- Los usuarios NO se crean acá (Supabase Auth los maneja aparte): abajo
-- hay dos UPDATE comentados para vincular tu usuario.
-- ============================================================

do $$
declare
  v_local uuid;
  v_menu  uuid;
  v_cafes uuid;
  v_sand  uuid;
  v_post  uuid;
begin
  select id into v_local from public.locals where slug = 'cafe-central';

  if v_local is null then
    insert into public.locals (name, slug, currency)
    values ('Café Central', 'cafe-central', 'CLP')
    returning id into v_local;
  end if;

  select id into v_menu
  from public.menus
  where local_id = v_local
  order by created_at
  limit 1;

  -- Idempotencia simple: si ya hay categorías, no re-seedear.
  if exists (select 1 from public.categories where menu_id = v_menu) then
    return;
  end if;

  insert into public.categories (menu_id, local_id, name, sort_order)
  values (v_menu, v_local, 'Cafés', 1) returning id into v_cafes;
  insert into public.categories (menu_id, local_id, name, sort_order)
  values (v_menu, v_local, 'Sándwiches', 2) returning id into v_sand;
  insert into public.categories (menu_id, local_id, name, sort_order)
  values (v_menu, v_local, 'Postres', 3) returning id into v_post;

  insert into public.products
    (menu_id, local_id, category_id, name, description, price_cents, sort_order)
  values
    (v_menu, v_local, v_cafes, 'Espresso',    'Simple',                    1800, 1),
    (v_menu, v_local, v_cafes, 'Cappuccino',  'Con espuma de leche',       2600, 2),
    (v_menu, v_local, v_cafes, 'Flat White',  null,                        2800, 3),
    (v_menu, v_local, v_sand,  'Jamón y queso','En pan ciabatta',          4500, 1),
    (v_menu, v_local, v_sand,  'Veggie',      'Palta, tomate, rúcula',     4900, 2),
    (v_menu, v_local, v_post,  'Cheesecake',  'Porción',                   3900, 1),
    (v_menu, v_local, v_post,  'Brownie',     'Con nuez',                  3200, 2);
end;
$$;

-- ------------------------------------------------------------
-- Vinculá tu usuario (creá los usuarios antes en el dashboard:
-- Authentication -> Users -> Add user, o por signup).
-- ------------------------------------------------------------

-- (a) Promover a SUPER-ADMIN (reemplazá el email):
-- update public.profiles
--   set role = 'super_admin', local_id = null
-- where id = (select id from auth.users where email = 'admin@ejemplo.com');

-- (b) Asignar un DUEÑO al local demo (reemplazá el email):
-- update public.profiles
--   set role = 'owner',
--       local_id = (select id from public.locals where slug = 'cafe-central')
-- where id = (select id from auth.users where email = 'dueno@ejemplo.com');
