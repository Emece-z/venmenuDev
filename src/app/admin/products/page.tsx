import { getOwnerContext } from "@/lib/owner";
import { CreateProductForm } from "@/components/admin/create-product-form";
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

      <CreateProductForm categories={cats} currency={currency} />

      <ProductsManager
        products={products ?? []}
        categories={cats}
        currency={currency}
      />
    </div>
  );
}
