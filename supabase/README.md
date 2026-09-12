# Base de datos (Supabase / Postgres)

## Aplicar el esquema

### Opción A — SQL Editor del dashboard (rápido para el MVP)

Pegá y ejecutá **en orden**:

1. `migrations/0001_init.sql`
2. `migrations/0002_rls.sql`
3. `migrations/0003_triggers.sql`
4. `migrations/0004_storage.sql` (bucket de imágenes de producto)
5. `migrations/0005_local_profile.sql` (datos públicos del local)
6. `migrations/0006_local_hours.sql` (horario de atención)
7. `migrations/0007_google_reviews.sql` (link de reseñas de Google)
8. `migrations/0008_local_avatar.sql` (avatar/logo del local)
9. `migrations/0009_local_theme.sql` (paleta de color + banner)
10. `seed.sql` (opcional, datos demo)

> Si ya tenías la base creada, corré sueltas las migraciones nuevas
> (`0004_…` a `0009_…`) — son idempotentes.

### Opción B — Supabase CLI (recomendado cuando el esquema se estabilice)

```bash
npm i -g supabase
supabase link --project-ref <TU_PROJECT_REF>
supabase db push          # aplica todo lo de migrations/
supabase db seed           # corre seed.sql
```

## Crear los primeros usuarios

Supabase Auth maneja los usuarios; `profiles` solo guarda rol + local.

1. Dashboard → **Authentication → Users → Add user** (email + contraseña).
   El trigger `on_auth_user_created` crea la fila en `profiles` (rol `owner`, sin local).
2. Corré el `UPDATE` correspondiente que está comentado al final de `seed.sql`:
   - promover ese usuario a `super_admin`, o
   - asignarlo como `owner` del local demo.

## Regenerar los tipos TypeScript

Cuando cambie el esquema:

```bash
supabase gen types typescript --project-id <TU_PROJECT_REF> > ../src/lib/types.ts
```

## Notas de diseño

- **Multi-tenant**: base y esquema compartidos; cada fila lleva `local_id`.
  El aislamiento lo hace **RLS**, no la aplicación.
- **`locals.status`** es la llave del acceso público. Solo la cambia el
  super-admin (trigger `guard_local_status`). Cuando se integre el cobro,
  un job con la `service_role` key pondrá `status = 'suspended'` al vencer
  la mensualidad.
- **`price_cents`**: dinero como entero. Para CLP, 1 = 1 peso.
- **Sin `local_id` en `products`/`categories` "puro"**: está denormalizado y
  atado con FK compuesta a `menus(id, local_id)` para que las políticas RLS
  sean simples y usen índice.
