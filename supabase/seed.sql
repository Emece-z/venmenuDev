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
