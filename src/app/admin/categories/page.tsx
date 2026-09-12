import { getOwnerContext } from "@/lib/owner";
import { CategoriesManager } from "@/components/admin/categories-manager";

export default async function CategoriesPage() {
  const { supabase, menu } = await getOwnerContext();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("menu_id", menu?.id ?? "")
    .order("sort_order", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Categorías</h1>
      <CategoriesManager categories={categories ?? []} />
    </div>
  );
}
