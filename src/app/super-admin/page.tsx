import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateLocalForm } from "@/components/super-admin/create-local-form";
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
        <CreateLocalForm />
      </section>

      <section className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Locales</h1>
        <LocalsTable locals={rows} />
      </section>
    </div>
  );
}
