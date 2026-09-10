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
