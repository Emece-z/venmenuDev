-- ============================================================
-- 0009_local_theme.sql — Paleta de color + banner del menú público
-- ============================================================
-- theme_bg/theme_text/theme_accent: hex ("#rrggbb"), opcionales — si son
-- null, la app usa un default neutro (el mismo look que había antes de esta
-- feature). banner_url: imagen de fondo del encabezado, opcional.
-- El banner reusa el bucket `local-avatars` (mismas políticas: escribe el
-- dueño o el super-admin), con la ruta `<local_id>/banner`.
-- ============================================================

alter table public.locals
  add column if not exists theme_bg text,
  add column if not exists theme_text text,
  add column if not exists theme_accent text,
  add column if not exists banner_url text;
