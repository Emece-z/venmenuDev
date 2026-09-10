import Link from "next/link";
import { getOwnerContext } from "@/lib/owner";
import { toggleMenuPublished } from "./actions";

export default async function AdminHomePage() {
  const { supabase, menu, local } = await getOwnerContext();

  const [{ count: productCount }, { count: categoryCount }] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", menu?.id ?? ""),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", menu?.id ?? ""),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Resumen</h1>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Productos" value={productCount ?? 0} />
        <Stat label="Categorías" value={categoryCount ?? 0} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 text-sm">
        <div>
          <p className="font-medium">Menú: {menu?.name ?? "—"}</p>
          <p className="mt-1 text-neutral-600">
            {menu?.is_published
              ? "Publicado — visible en la página pública."
              : "Oculto — la página pública no muestra productos."}
          </p>
        </div>
        <form action={toggleMenuPublished}>
          <input
            type="hidden"
            name="next"
            value={(!menu?.is_published).toString()}
          />
          <button className="rounded border border-neutral-300 px-3 py-1.5 text-sm">
            {menu?.is_published ? "Ocultar menú" : "Publicar menú"}
          </button>
        </form>
        {local && (
          <Link
            href={`/m/${local.slug}`}
            target="_blank"
            className="text-xs text-neutral-500 underline"
          >
            Ver página pública: /m/{local.slug}
          </Link>
        )}
      </div>

      <div className="flex gap-3 text-sm">
        <Link href="/admin/products" className="underline">
          Gestionar productos
        </Link>
        <Link href="/admin/categories" className="underline">
          Gestionar categorías
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
