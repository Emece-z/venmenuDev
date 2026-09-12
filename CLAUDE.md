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
- **Feedback inline (`useActionState`) en (casi) todos los forms** — error u
  "OK ✓" en la misma pantalla, sin la pantalla roja de Next. Estado compartido
  en `src/lib/form-state.ts` (`FormState` = `{ ok, error }`). Actions que
  siguen "simples" (sin FormState, `throw` + botón de un clic, casi sin
  casos de error reales): `deleteCategory`, `deleteProduct`,
  `toggleProductAvailability`, `setLocalStatus`.
- **Panel dueño (`/admin`):** resumen con contadores + toggle publicar/ocultar
  menú + descarga de **QR**.
  **Categorías** (`/admin/categories`): todo en el componente cliente
  `CategoriesManager` — alta con feedback inline, un solo botón "Guardar" que
  persiste todas las filas a la vez (`saveCategories`, también con feedback).
  El orden se **arrastra** (`@dnd-kit/core` + `/sortable` + `/utilities`: mouse,
  touch y teclado), no se edita como número — `sort_order` que se manda al
  guardar es la posición en la lista (índice + 1). Categoría nueva entra
  siempre al final; se arrastra a su lugar después.
  **Productos** (`/admin/products`): alta en `CreateProductForm` (colapsable,
  feedback inline) + `ProductsManager` con buscador, filtro por
  categoría/disponibilidad, orden por columna y edición inline con feedback
  (`updateProduct`); `deleteProduct`/`toggleProductAvailability` quedaron simples.
  **Ajustes** (`/admin/settings`): componente cliente `SettingsForm`. El dueño
  edita nombre, moneda (valida ISO 4217 contra `Intl`), los **datos públicos
  del local** (descripción/bienvenida, dirección, teléfono, WhatsApp, Instagram),
  el **horario de atención** semanal (`WeekHoursFields`: rango horario por día
  + checkbox "Cerrado"; helpers en `src/lib/hours.ts`, guardado en `locals.hours`
  jsonb) y el **link de reseña de Google** (checkbox "Mostrar link…" que habilita
  el campo de URL; solo tiene sentido si el local está registrado en Google con
  el nombre del comercio — se lo aclara en la ayuda del campo;
  `locals.google_reviews_enabled` + `google_review_url`). Slug, estado y
  suscripción son solo lectura (los toca el super-admin).
- **Panel super-admin (`/super-admin`):** formulario **"Nuevo local + dueño"**
  en `CreateLocalForm` (`createLocalWithOwner`: crea local + usuario de login +
  vincula perfil con el cliente `service_role`, con rollback; incluye selector
  de **plan**; feedback inline). Lista de locales en el componente cliente
  `LocalsTable`: buscador por nombre/slug, toggle "solo suspendidos", contador
  de productos, estado del menú y descarga de **QR** por fila, y edición
  inline con feedback → `updateLocal` (nombre/slug/moneda; el slug es editable
  con aviso de que rompe QR/NFC) + `updateSubscription` (plan + estado). **No
  hay borrado de locales**: solo suspender/reactivar (`setLocalStatus`, simple).
- **Planes:** `src/lib/plans.ts` — `PLANS` = `basico | estandar | premium`
  (placeholder, valores en `subscriptions.plan`), `planLabel`, estados de
  suscripción y sus etiquetas. Módulo plano (sin `use server`) para usarlo en
  actions y en componentes cliente.
- **Imágenes de producto (Supabase Storage):** bucket público `product-images`,
  ruta `<local_id>/<product_id>` (1 objeto por producto, sin extensión). Subida y
  borrado en las server actions de `/admin/products` con el cliente normal (las
  políticas de `storage.objects` dejan escribir solo en la carpeta del propio
  local vía `public.owns_local`). `products.image_url` guarda la URL pública con
  `?t=<ts>` para bustear caché tras un reemplazo. Config de dominios en
  `next.config.ts` (`images.remotePatterns` -> `*.supabase.co`). Helpers y límites
  en `src/lib/images.ts` (JPG/PNG/WebP, 3 MB). Se muestran en `/admin/products`
  (miniatura + reemplazo/quitar en la edición) y en `/m/[slug]` (miniatura 64px).
- **Página pública (`/m/[slug]`):** SSR, mobile-first, cache 30s, sin login.
  Header con nombre + descripción/bienvenida + contacto (dirección, teléfono
  `tel:`, WhatsApp `wa.me` con ícono, Instagram con ícono, y **reseña de
  Google** con ícono si el dueño la activó) + **horario** en `<details>`
  plegado. Íconos de marca inline en `src/components/brand-icons.tsx` (sin
  librerías ni requests externos). Categorías **desplegables** (`<details>`
  nativo, sin JS de cliente; la primera abierta). Foto de producto con
  **lightbox** al tocar la miniatura (técnica `:target` en CSS puro, ver
  `globals.css` — sin JS, no abre pestaña nueva, la imagen grande no se
  descarga hasta que el usuario la abre: `loading="lazy"` + contenedor
  `display:none`). RLS oculta locales suspendidos / menús no publicados /
  productos no disponibles.
- **QR del menú:** `GET /api/qr?slug=<slug>` (`src/app/api/qr/route.ts`) genera
  el QR **en el servidor** con la librería `qrcode` (npm, sin servicio de
  terceros, sin costo) apuntando a `${NEXT_PUBLIC_SITE_URL}/m/<slug>` y lo
  devuelve como descarga PNG (único formato) con `Content-Disposition:
  attachment` + el link lleva `download=` para forzar guardado directo (si el
  navegador tiene activado "preguntar dónde guardar cada archivo", eso es
  ajeno al sitio: se apaga desde la config del propio navegador). Autorización
  manual en la misma ruta (no cubierta por `middleware.ts`, que solo guarda
  `/admin` y `/super-admin`): dueño solo para su propio local, super-admin
  para cualquiera. Botones de descarga en `/admin` (resumen) y por fila en
  `LocalsTable` (`/super-admin`).
- **DB:** `supabase/migrations/0001_init.sql` … `0007_google_reviews.sql` + `seed.sql`.
  `supabase/setup.sql` es la concatenación de todo para pegar de una en el SQL
  Editor. **Ojo:** cada migración nueva hay que correrla en Supabase; si falta
  alguna de `0005`–`0007`, `/m/[slug]` y `/admin/settings` fallan (el `select`
  pide columnas que no existen).

Pendiente (en este orden sugerido):

1. Grabar el NFC apuntando a `/m/[slug]` (físico, fuera del código; el QR de
   respaldo ya está listo).
2. **Módulo de pagos** (tótem + mensualidad, webhook, job que suspende por impago). Fuera de alcance hasta que se pida.

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
- Server Action con feedback inline en la UI (error o "OK ✓" sin la pantalla de
  Next): firma `(prevState: FormState, formData) => Promise<FormState>` (tipo
  en `src/lib/form-state.ts`), consumida con `useActionState` desde un
  componente cliente. Si la acción se llama desde un botón `formAction` dentro
  de OTRO form ya envuelto en `useActionState` (ej. "Eliminar" en una fila),
  esa acción puede seguir siendo simple (`(formData) => void`, `throw` en vez
  de retornar) — no hace falta que todas comportan la misma firma dentro de un
  mismo form.
- **React 19: un `<button formAction={fn}>` con `fn` una función NO puede
  llevar además `name`/`value`** (error en consola: "Cannot specify a name
  prop for a button that specifies a function as a formAction"; React los usa
  para codificar qué acción invocar). Para identificar una fila dentro de un
  form compartido (ej. "Eliminar" en `CategoriesManager`), enlazar el dato con
  `.bind(null, id)` — `formAction={deleteCategory.bind(null, c.id)}`, con la
  action tomando `id` como primer parámetro — en vez de `name`/`value` en el
  botón.

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
- Un archivo `"use server"` **solo puede exportar funciones async**. El estado
  inicial y los tipos para `useActionState` van en un módulo aparte (ej.
  `src/app/admin/settings/state.ts`), no en el `actions.ts`.
- **Nunca usar `disabled` en un input cuyo valor hay que preservar** (ej. un
  campo que un checkbox "activa/desactiva" para mostrarlo en público). Un input
  `disabled` NO se envía en el `FormData` al enviar el form, así que guardar con
  el checkbox destildado borra el valor. Usar `readOnly` (+ clases para que se
  vea apagado): el valor viaja igual y el server decide si lo muestra. Bug real
  encontrado y corregido el 2026-09-12 en `SettingsForm` (Google reviews) y
  `WeekHoursFields` (horario) — ver `src/lib/hours.ts` y `settings-form.tsx`.
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
