// Tipos de la base de datos escritos a mano para el MVP.
// Cuando el esquema se estabilice, reemplazar por generación automática:
//   npx supabase gen types typescript --project-id <ref> > src/lib/types.ts
//
// Nota: se usan `type` (no `interface`) a propósito. postgrest-js exige que
// cada Row/Insert/Update sea asignable a `Record<string, unknown>`, y las
// `interface` de TS no traen index signature implícita -> darían `never`.

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
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
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
