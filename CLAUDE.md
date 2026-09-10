# VenMenu — contexto para Claude Code

> Este archivo lo lee automáticamente cada sesión nueva de Claude Code abierta en
> esta carpeta. Mantenerlo actualizado a medida que avanza el proyecto.

## Qué es

Plataforma **multi-tenant** de menús digitales para locales gastronómicos
(restaurantes / cafeterías / bares). El cliente final abre el menú acercando el
teléfono a una tarjeta **NFC** o escaneando un **QR** de respaldo. Cada local
administra su propio menú de forma independiente.

**Monetización (todavía NO implementada):** (1) pago inicial por el tótem físico
con NFC y (2) membresía mensual recurrente. Si un local no paga, se le suspende
el acceso público automáticamente.

## Stack

- **Next.js 15** (App Router, carpeta `src/`, TypeScript estricto) — front + back en un proyecto.
- **Supabase** (Postgres + Auth). El aislamiento entre locales se hace con **RLS** en la base, no en la app.
- **Tailwind CSS v4** (config en CSS, sin `tailwind.config.js`).
- Server Actions + `revalidatePath` para las mutaciones (casi nada de JS en el cliente).

## Estado actual (2026-09-10)

Hecho y verificado (`tsc` + `eslint` en verde; ver gotcha sobre `next build`):

- Esqueleto completo del proyecto.
- **Auth:** login único (`/login`) para dueño de local y super-admin; el rol vive
  en `profiles.role`. Guard por área en `src/middleware.ts` + `requireOwner()` /
  `requireSuperAdmin()` como segunda barrera. Pantalla `/sin-local` para usuario
  sin local asignado (evita bucle de redirects).
- **Panel dueño (`/admin`):** resumen con contadores + toggle publicar/ocultar
  menú; **CRUD de categorías** (`/admin/categories`, un solo botón "Guardar" que
  persiste todas las filas a la vez vía `saveCategories`; `sort_order` mínimo 1);
  **CRUD de productos** (`/admin/products`): form de alta colapsable + componente
  cliente `ProductsManager` con buscador, filtro por categoría/disponibilidad,
  orden por columna y edición inline (expande la fila). Las server actions
  (`createProduct`/`updateProduct`/`deleteProduct`/`toggleProductAvailability`)
  no cambiaron.
- **Panel super-admin (`/super-admin`):** formulario **"Nuevo local + dueño"**
  (`createLocalWithOwner`: crea local + usuario de login + vincula perfil con el
  cliente `service_role`, con rollback; incluye selector de **plan**). Lista de
  locales en el componente cliente `LocalsTable`: buscador por nombre/slug,
  toggle "solo suspendidos", contador de productos y estado del menú por fila,
  y edición inline → `updateLocal` (nombre/slug/moneda; el slug es editable con
  aviso de que rompe QR/NFC) + `updateSubscription` (plan + estado). **No hay
  borrado de locales**: solo suspender/reactivar (`setLocalStatus`).
- **Planes:** `src/lib/plans.ts` — `PLANS` = `basico | estandar | premium`
  (placeholder, valores en `subscriptions.plan`), `planLabel`, estados de
  suscripción y sus etiquetas. Módulo plano (sin `use server`) para usarlo en
  actions y en componentes cliente.
- **Página pública (`/m/[slug]`):** SSR, mobile-first, cache 30s, sin login.
  Categorías **desplegables** (`<details>` nativo, sin JS de cliente; la primera
  abierta). RLS oculta locales suspendidos / menús no publicados / productos no disponibles.
- **DB:** `supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_triggers.sql`
  + `seed.sql`. `supabase/setup.sql` es la concatenación de los 4 para pegar de
  una en el SQL Editor.

Pendiente (en este orden sugerido):

1. Editar nombre/moneda del local desde `/admin/settings` (hoy solo lectura).
2. **Módulo de pagos** (tótem + mensualidad, webhook, job que suspende por impago). Fuera de alcance hasta que se pida.
4. **Subida de imágenes** de productos con Supabase Storage (la columna `products.image_url` ya existe). Fuera de alcance hasta que se pida.
5. Generar el QR y grabar el NFC apuntando a `/m/[slug]`.

## Modelo de datos

- **locals** — el tenant. `slug` = URL pública `/m/<slug>`. `status`
  (`active` / `suspended`) = llave del acceso público; **solo la cambia el
  super-admin** (lo fuerza el trigger `guard_local_status`).
- **profiles** — 1:1 con `auth.users`. `role` (`owner` / `super_admin`) +
  `local_id` (null para super-admin). La fila la crea el trigger
  `handle_new_user`. El trigger `guard_profile_privileges` impide que un usuario
  logueado se cambie el rol/local (pero permite operaciones sin `auth.uid()`,
  ej. desde el SQL Editor).
- **menus** — 1 por local en el MVP (lo crea el trigger `handle_new_local`).
  `is_published` = publicar/ocultar el menú completo.
- **categories** — cuelgan del menú. Llevan `local_id` denormalizado + FK
  compuesta a `menus(id, local_id)`.
- **products** — nombre, descripción, `price_cents` (entero; para CLP 1 = 1 peso),
  `category_id`, `is_available`, `sort_order`, `image_url` (vacío hasta integrar Storage).
- **subscriptions** — 1:1 con local (lo crea `handle_new_local` en `trialing`).
  `status`: `trialing` / `active` / `past_due` / `canceled`. Hoy la ajusta el super-admin a mano.

## Convenciones

- Dinero: **siempre `price_cents` entero**. Conversión en `src/lib/money.ts`
  (`parsePriceToCents` / `centsToInput`), formateo en `src/lib/format.ts` (`formatPrice`).
- Contexto del dueño: `src/lib/owner.ts` → `getOwnerContext()` devuelve
  `{ profile, supabase, local, menu, currency }`. Usarlo en toda pantalla/acción de `/admin`.
- Toda Server Action vuelve a pasar por `requireOwner()` / `requireSuperAdmin()` y
  filtra por `local_id` además de confiar en RLS.
- Tipos de la DB a mano en `src/lib/types.ts` (usar `type`, no `interface`, o
  postgrest-js los resuelve como `never`). Cuando el esquema esté estable:
  `supabase gen types typescript`.
- Versiones alineadas a propósito: `@supabase/ssr@^0.12` con `@supabase/supabase-js@^2.116`.

## Entorno / gotchas

- **El proyecto se movió a `C:\dev\venmenu`** (antes estaba en
  `OneDrive/Escritorio/VENMENU`). OneDrive sincronizaba `node_modules` y `.next`
  y corrompía la build (`Cannot find module './xxx.js'`) y bloqueaba carpetas.
  **No volver a poner el proyecto dentro de OneDrive.**
- Si aparece `Cannot find module './xxx.js'` en runtime: `Remove-Item -Recurse -Force .next` y `npm run dev`.
- **No correr `npm run build` con el `npm run dev` vivo:** ambos escriben en
  `.next` y la corrompen (la UI queda sin estilos). Para verificar cambios con el
  dev server corriendo usar solo `npx tsc --noEmit` y `npx next lint`. Si ya se
  rompió: matar el node de `:3000`, borrar `.next`, `npm run dev`, hard-reload.
- Componentes cliente que necesitan interacción (buscadores, filtros, edición
  inline): reciben los datos ya traídos por el Server Component como props y solo
  manejan UI; las escrituras siguen yendo por Server Actions. Ej.
  `src/components/super-admin/locals-table.tsx`, `src/components/admin/products-manager.tsx`.
- Windows es case-insensitive: no crear carpetas que difieran solo en mayúsculas.
- Shell primario PowerShell 5.1: sin `&&` / `||` / ternario. Para robocopy y
  comandos con flags `/X`, usar PowerShell (Git Bash traduce mal las rutas `/E`).

## Supabase

- Proyecto: ref `thcmkcuerbvizhsmhpey` (org "Emece-z's", plan free).
- Credenciales reales en `.env.local` (no versionado). Usa las keys nuevas
  `sb_publishable_...` (cliente) y `sb_secret_...` (servidor).
- `NEXT_PUBLIC_SUPABASE_URL` debe ser `https://<ref>.supabase.co` **sin** `/rest/v1/`.
- Usuarios de prueba ya creados: `casanova.zamora@gmail.com` (super_admin),
  `aguavetta@av.cl` (owner del local `aguavetta`). También existe el local demo `cafe-central`.

## Cómo correr

```powershell
npm install       # solo la primera vez
npm run dev        # http://localhost:3000
```

Aplicar/re-aplicar esquema: pegar `supabase/setup.sql` en el SQL Editor de Supabase
(detalle en `supabase/README.md`).
