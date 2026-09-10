import { getOwnerContext } from "@/lib/owner";
import { createProduct } from "./actions";
import { ProductsManager } from "@/components/admin/products-manager";

type Category = { id: string; name: string };

export default async function ProductsPage() {
  const { supabase, menu, currency } = await getOwnerContext();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("menu_id", menu?.id ?? "")
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select(
        "id, name, description, price_cents, category_id, is_available, sort_order, image_url",
      )
      .eq("menu_id", menu?.id ?? "")
      .order("sort_order", { ascending: true }),
  ]);

  const cats: Category[] = categories ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Productos</h1>

      {cats.length === 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Podés crear productos sin categoría, pero conviene crear las categorías
          primero en la pestaña <strong>Categorías</strong>.
        </p>
      )}

      {/* Crear (colapsable para no ocupar espacio en listas largas) */}
      <details className="rounded-lg border border-neutral-200 [&[open]>summary]:mb-3">
        <summary className="cursor-pointer list-none p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          + Nuevo producto
        </summary>
        <form action={createProduct} className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
          <Field label="Nombre" name="name" required />
          <Field
            label={`Precio (${currency})`}
            name="price"
            required
            inputMode="numeric"
            placeholder="1800"
          />
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-neutral-500">Descripción</span>
            <input
              name="description"
              className="rounded border border-neutral-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Categoría</span>
            <select
              name="category_id"
              defaultValue=""
              className="rounded border border-neutral-300 px-2 py-1"
            >
              <option value="">Sin categoría</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="is_available" defaultChecked />
            Disponible
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-neutral-500">Imagen (JPG/PNG/WebP, máx. 3 MB)</span>
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              className="text-sm"
            />
          </label>
          <div className="sm:col-span-2">
            <button className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
              Agregar producto
            </button>
          </div>
        </form>
      </details>

      <ProductsManager
        products={products ?? []}
        categories={cats}
        currency={currency}
      />
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  inputMode,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        className="rounded border border-neutral-300 px-2 py-1"
      />
    </label>
  );
}
