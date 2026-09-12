-- ============================================================
-- 0011_delivery.sql — Delivery (apps externas + delivery propio)
-- ============================================================
-- Se muestra al final de /m/[slug]. Todo opcional: el dueño carga solo los
-- servicios que use. No requiere cambios de RLS (locals_update ya alcanza).
-- ============================================================

alter table public.locals
  add column if not exists delivery_uber_url      text,
  add column if not exists delivery_rappi_url     text,
  add column if not exists delivery_pedidosya_url text,
  add column if not exists delivery_own_enabled   boolean not null default false,
  add column if not exists delivery_own_whatsapp  text;
