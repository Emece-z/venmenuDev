import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createLocalWithOwner } from "./actions";
import { PLANS, planLabel } from "@/lib/plans";
import { LocalsTable, type LocalRow } from "@/components/super-admin/locals-table";

export default async function SuperAdminHomePage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Queries planas y merge en JS (los tipos a mano no describen las relaciones).
  const [{ data: locals }, { data: subs }, { data: menus }, { data: products }] =
    await Promise.all([
      supabase
        .from("locals")
        .select("id, name, slug, currency, status, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("local_id, status, plan"),
      supabase.from("menus").select("local_id, is_published"),
      supabase.from("products").select("local_id"),
    ]);

  const subByLocal = new Map((subs ?? []).map((s) => [s.local_id, s]));
  const publishedByLocal = new Map(
    (menus ?? []).map((m) => [m.local_id, m.is_published]),
  );
  const productCountByLocal = new Map<string, number>();
  for (const p of products ?? []) {
    productCountByLocal.set(
      p.local_id,
      (productCountByLocal.get(p.local_id) ?? 0) + 1,
    );
  }

  const rows: LocalRow[] = (locals ?? []).map((l) => {
    const sub = subByLocal.get(l.id);
    return {
      id: l.id,
      name: l.name,
      slug: l.slug,
      currency: l.currency,
      status: l.status,
      plan: sub?.plan ?? "basico",
      subStatus: sub?.status ?? "trialing",
      productCount: productCountByLocal.get(l.id) ?? 0,
      isPublished: publishedByLocal.get(l.id) ?? false,
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Nuevo local + dueño</h1>
        <form
          action={createLocalWithOwner}
          className="grid gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-2"
        >
          <p className="text-sm text-neutral-500 sm:col-span-2">
            Crea el local y su usuario dueño en un paso. El menú y la suscripción
            se generan solos.
          </p>
          <Field label="Nombre del local" name="name" required placeholder="Café Central" />
          <Field
            label="Slug (URL pública /m/…)"
            name="slug"
            required
            placeholder="cafe-central"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
          <Field label="Moneda" name="currency" defaultValue="CLP" placeholder="CLP" />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Plan</span>
            <select
              name="plan"
              defaultValue="basico"
              className="rounded border border-neutral-300 px-2 py-1"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {planLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Nombre del dueño (opcional)"
            name="full_name"
            placeholder="Ana Pérez"
          />
          <Field
            label="Email del dueño"
            name="email"
            type="email"
            required
            placeholder="dueno@ejemplo.com"
          />
          <Field
            label="Contraseña inicial (mín. 8)"
            name="password"
            type="password"
            required
            minLength={8}
          />
          <div className="sm:col-span-2">
            <button className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
              Crear local
            </button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Locales</h1>
        <LocalsTable locals={rows} />
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  pattern,
  minLength,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  pattern?: string;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        pattern={pattern}
        minLength={minLength}
        className="rounded border border-neutral-300 px-2 py-1"
      />
    </label>
  );
}
