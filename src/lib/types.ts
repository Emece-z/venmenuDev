// Tipos de la base de datos escritos a mano para el MVP.
// Cuando el esquema se estabilice, reemplazar por generación automática:
//   npx supabase gen types typescript --project-id <ref> > src/lib/types.ts
//
// Nota: se usan `type` (no `interface`) a propósito. postgrest-js exige que
// cada Row/Insert/Update sea asignable a `Record<string, unknown>`, y las
// `interface` de TS no traen index signature implícita -> darían `never`.

import type { WeekHours } from "@/lib/hours";

export type UserRole = "owner" | "super_admin";
export type LocalStatus = "active" | "suspended";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export type Local = {
  id: string;
  name: string;
  slug: string;
  status: LocalStatus;
  currency: string;
  created_at: string;
  // Datos públicos editables por el dueño (0005). Todos opcionales.
  // `address` queda sin usar desde 0010 (reemplazado por local_addresses),
  // se deja en la tabla para no perder datos históricos.
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  // Horario de atención (0006). jsonb; null = sin configurar.
  hours: WeekHours | null;
  // Link de reseñas de Google (0007). Solo se muestra si enabled=true y hay URL.
  google_reviews_enabled: boolean;
  google_review_url: string | null;
  // Avatar/logo del local (0008). Editable por el dueño y por el super-admin.
  avatar_url: string | null;
  // Paleta de color + banner del menú público (0009). Hex ("#rrggbb") o null
  // = sin elegir (usa el default neutro, ver src/lib/theme.ts).
  theme_bg: string | null;
  theme_text: string | null;
  theme_accent: string | null;
  banner_url: string | null;
  // Delivery (0011). Links opcionales a apps externas + delivery propio por
  // WhatsApp (si `delivery_own_whatsapp` está vacío, se usa `whatsapp`).
  delivery_uber_url: string | null;
  delivery_rappi_url: string | null;
  delivery_pedidosya_url: string | null;
  delivery_own_enabled: boolean;
  delivery_own_whatsapp: string | null;
};

// Direcciones del local (0010): 1 o varias sucursales. Cada una se muestra
// en /m/[slug] con un ícono de ubicación que linkea a Google Maps.
export type LocalAddress = {
  id: string;
  local_id: string;
  label: string | null;
  address: string;
  sort_order: number;
  created_at: string;
};

export type Profile = {
  id: string; // = auth.users.id
  role: UserRole;
  local_id: string | null; // null para super_admin
  full_name: string | null;
  created_at: string;
};

export type Menu = {
  id: string;
  local_id: string;
  name: string;
  is_published: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  menu_id: string;
  local_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Product = {
  id: string;
  menu_id: string;
  local_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number; // dinero como entero en unidad menor (evita floats)
  image_url: string | null; // se llena cuando agreguemos Storage
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  local_id: string;
  status: SubscriptionStatus;
  plan: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────────────────────
// Forma que espera @supabase/postgrest-js para tipar `.from(...)`.
// ─────────────────────────────────────────────────────────────
type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      locals: TableDef<Local>;
      profiles: TableDef<Profile>;
      menus: TableDef<Menu>;
      categories: TableDef<Category>;
      products: TableDef<Product>;
      subscriptions: TableDef<Subscription>;
      local_addresses: TableDef<LocalAddress>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      local_status: LocalStatus;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
