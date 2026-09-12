-- ============================================================
-- 0007_google_reviews.sql — Link de reseñas de Google (opcional)
-- ============================================================
-- Solo tiene sentido si el local está registrado en Google (Google Business
-- Profile / Maps) con el nombre del comercio. El dueño lo activa a mano desde
-- /admin/settings con un checkbox; si no, no se muestra nada en /m/<slug>.
-- ============================================================

alter table public.locals
  add column if not exists google_reviews_enabled boolean not null default false,
  add column if not exists google_review_url text;
