-- ============================================================
-- 0010_local_addresses.sql — Direcciones del local (1 o varias sucursales)
-- ============================================================
-- Reemplaza el campo único `locals.address` (que se deja intacto, sin usar,
-- para no perder datos) por una tabla: el dueño puede cargar más de una
-- dirección si tiene varias sucursales. Cada una se muestra en /m/[slug]
-- con un ícono de ubicación que linkea a Google Maps.
-- ============================================================

create table if not exists public.local_addresses (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locals(id) on delete cascade,
  label text,
  address text not null,
  sort_order int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists local_addresses_local_id_idx
  on public.local_addresses(local_id);

grant select on public.local_addresses to anon;
grant select, insert, update, delete on public.local_addresses to authenticated;

alter table public.local_addresses enable row level security;

-- Mismo criterio que categories/products: público si el local está activo,
-- siempre visible para su dueño y para el super-admin.
create policy local_addresses_select on public.local_addresses
  for select to anon, authenticated
  using (
    public.owns_local(local_id)
    or public.is_super_admin()
    or exists (
      select 1 from public.locals l
      where l.id = local_addresses.local_id and l.status = 'active'
    )
  );

create policy local_addresses_write on public.local_addresses
  for all to authenticated
  using (public.owns_local(local_id) or public.is_super_admin())
  with check (public.owns_local(local_id) or public.is_super_admin());

-- Migra la dirección única ya cargada (si existe) como primera fila, para
-- que nadie pierda lo que ya tenía escrito.
insert into public.local_addresses (local_id, address, sort_order)
select id, address, 1
from public.locals
where address is not null and trim(address) <> '';
