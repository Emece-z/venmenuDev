import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

// Página pública del menú. Sin login. Se abre al acercar el NFC o escanear el QR.
// Renderizada en el servidor (rápida, sin JS de cliente). Los datos se leen con
// la anon key: RLS solo deja ver locales activos y menús publicados, así que un
// local suspendido cae en notFound() automáticamente.
export const revalidate = 30; // cache de 30s: el menú no cambia a cada request

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: local } = await supabase
    .from("locals")
    .select("id, name, currency")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!local) notFound();

  const { data: menu } = await supabase
    .from("menus")
    .select("id")
    .eq("local_id", local.id)
    .eq("is_published", true)
    .limit(1)
    .single();

  if (!menu) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("menu_id", menu.id)
    .order("sort_order", { ascending: true });

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, description, price_cents, category_id, sort_order, image_url",
    )
    .eq("menu_id", menu.id)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  const byCategory = groupByCategory(categories ?? [], products ?? []);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-semibold">{local.name}</h1>

      <div className="mt-6 flex flex-col">
        {byCategory.map((group, i) => (
          <details
            key={group.id}
            open={i === 0}
            className="group border-b border-neutral-100 last:border-b-0"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 [&::-webkit-details-marker]:hidden">
              <span>{group.name}</span>
              <span className="flex items-center gap-2 text-xs font-normal normal-case text-neutral-400">
                {group.items.length}
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-open:rotate-180"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </summary>
            <ul className="flex flex-col divide-y divide-neutral-100 pb-2">
              {group.items.map((p) => (
                <li key={p.id} className="flex gap-3 py-3">
                  {p.image_url && (
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    {p.description && (
                      <p className="mt-0.5 text-sm text-neutral-600">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums">
                    {formatPrice(p.price_cents, local.currency)}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ))}

        {byCategory.length === 0 && (
          <p className="text-sm text-neutral-500">
            Este menú todavía no tiene productos disponibles.
          </p>
        )}
      </div>
    </main>
  );
}

type Cat = { id: string; name: string; sort_order: number };
type Prod = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category_id: string | null;
  sort_order: number;
  image_url: string | null;
};

function groupByCategory(categories: Cat[], products: Prod[]) {
  const groups = categories.map((c) => ({
    id: c.id,
    name: c.name,
    items: products.filter((p) => p.category_id === c.id),
  }));

  const uncategorized = products.filter((p) => !p.category_id);
  if (uncategorized.length > 0) {
    groups.push({ id: "none", name: "Otros", items: uncategorized });
  }

  return groups.filter((g) => g.items.length > 0);
}
