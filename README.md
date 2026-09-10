# VenMenu

Plataforma multi-tenant de menús digitales para locales gastronómicos.
El cliente final abre el menú acercando el teléfono a una tarjeta **NFC**
(o escaneando un **QR** de respaldo). Cada local administra su propio menú.

## Stack

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 15** (App Router, `src/`) | Frontend + backend en un proyecto. SSR para que la página pública cargue rápido en el celular. |
| UI | **Tailwind CSS v4** | Estilado rápido, mobile-first, sin CSS suelto. |
| DB / Auth | **Supabase** (Postgres + Auth) | Auth lista, y **RLS** en Postgres para el aislamiento entre locales sin escribir esa lógica en la app. |
| Lenguaje | **TypeScript** estricto | |

> Pagos y subida de imágenes: **fuera de este paso** (ver más abajo).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y completar con los datos del proyecto Supabase
```

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Aplicar el esquema: ver [`supabase/README.md`](./supabase/README.md).
3. Copiar `Project URL` y `anon key` (Project Settings → API) a `.env.local`.
4. Crear usuarios y asignarles rol (instrucciones en `supabase/README.md`).

```bash
npm run dev   # http://localhost:3000
```

## Rutas

| Ruta | Acceso | Qué es |
|---|---|---|
| `/` | público | landing mínima |
| `/login` | público | login único (owner y super-admin) |
| `/m/[slug]` | **público, sin login** | página del menú que ve el cliente (NFC / QR) |
| `/admin` | rol `owner` | panel del local: resumen, productos, categorías, ajustes |
| `/super-admin` | rol `super_admin` | panel de plataforma: todos los locales, suscripción, activar/suspender |

El control de acceso por área está en [`src/middleware.ts`](./src/middleware.ts)
(+ `requireOwner` / `requireSuperAdmin` como segunda barrera en cada layout).

## Estructura

```
src/
  app/
    layout.tsx                raíz (mobile-first: viewport, <html lang="es">)
    page.tsx                  landing
    login/                    page + server action `signIn`
    auth/signout/route.ts     cerrar sesión (POST)
    admin/                    panel del dueño de local (layout con requireOwner)
      page.tsx  products/  categories/  settings/
    super-admin/              panel de plataforma (layout con requireSuperAdmin)
      page.tsx  actions.ts    (setLocalStatus: activar/suspender)
    m/[slug]/                 menú público (SSR, cache 30s) + not-found
  components/
    login-form.tsx            formulario cliente (useActionState)
  lib/
    env.ts                    lectura validada de variables de entorno
    types.ts                  tipos de la DB (a mano por ahora; luego gen types)
    format.ts                 formateo de precios (price_cents -> moneda)
    auth.ts                   getCurrentProfile / requireOwner / requireSuperAdmin
    supabase/
      client.ts               cliente browser (anon key)
      server.ts               cliente server (cookies)
      middleware.ts           refresh de sesión + guard por área
      admin.ts                cliente service_role (solo tareas de plataforma)
  middleware.ts               engancha el guard a todas las rutas
supabase/
  migrations/0001_init.sql    tablas + enums + índices
  migrations/0002_rls.sql     RLS + políticas + funciones auxiliares
  migrations/0003_triggers.sql provisión automática + integridad
  seed.sql                    local demo con menú de ejemplo
```

## Modelo de datos

- **locals** — el tenant. `slug` = URL pública. `status` (`active` / `suspended`)
  = llave del acceso público, solo la toca el super-admin.
- **profiles** — 1:1 con `auth.users`. `role` (`owner` / `super_admin`) y,
  para owners, `local_id`.
- **menus** — 1 por local en el MVP (la tabla permite varios a futuro).
  `is_published` = publicar/ocultar el menú completo.
- **categories** — pertenecen a un menú.
- **products** — nombre, descripción, `price_cents` (entero), `category_id`,
  `is_available`, `image_url` (se usará al integrar Storage).
- **subscriptions** — 1:1 con local. `status` (`trialing` / `active` /
  `past_due` / `canceled`). Hoy la ajusta el super-admin a mano.

## Próximos pasos (no incluidos en este esqueleto)

1. CRUD de productos y categorías en `/admin`.
2. Supabase Storage para imágenes de productos.
3. Pagos: alta con pago del tótem + mensualidad; webhook que marca
   `subscriptions.status` y un job que pone `locals.status = 'suspended'`
   al vencer.
4. Generación del QR y grabado del NFC apuntando a `/m/[slug]`.
