-- ============================================================
-- 0005_local_profile.sql — Datos públicos del local
-- ============================================================
-- Campos que el DUEÑO edita en /admin/settings y que se muestran en la
-- página pública /m/<slug> (bienvenida + cómo contactar/llegar).
-- Todos opcionales. No requieren cambios de RLS: la política `locals_update`
-- ya deja al dueño editar su local (el trigger solo bloquea `status`).
-- ============================================================

alter table public.locals
  add column if not exists description text,
  add column if not exists address     text,
  add column if not exists phone       text,
  add column if not exists whatsapp    text,
  add column if not exists instagram   text;
