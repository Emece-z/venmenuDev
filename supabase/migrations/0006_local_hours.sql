-- ============================================================
-- 0006_local_hours.sql — Horario de atención del local
-- ============================================================
-- `hours` (jsonb, opcional). Forma:
--   { "mon": {"closed": false, "open": "09:00", "close": "18:00"}, ... "sun": {...} }
-- El dueño lo edita en /admin/settings; en /m/<slug> se muestra colapsado.
-- No requiere cambios de RLS (la política `locals_update` ya cubre al dueño).
-- ============================================================

alter table public.locals
  add column if not exists hours jsonb;
