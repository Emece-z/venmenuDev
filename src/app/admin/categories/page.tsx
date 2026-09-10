import { getOwnerContext } from "@/lib/owner";
import { createCategory, saveCategories, deleteCategory } from "./actions";

export default async function CategoriesPage() {
  const { supabase, menu } = await getOwnerContext();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("menu_id", menu?.id ?? "")
    .order("sort_order", { ascending: true });

  const cats = categories ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Categorías</h1>

      {/* Crear */}
      <form
        action={createCategory}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Nueva categoría</span>
          <input
            name="name"
            required
            placeholder="Ej. Cafés"
            className="rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Orden</span>
          <input
            name="sort_order"
            type="number"
            min={1}
            defaultValue={cats.length + 1}
            className="w-20 rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <button className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
          Agregar
        </button>
      </form>

      {/* Listar + editar: un solo formulario, un solo botón "Guardar" */}
      {cats.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin categorías todavía.</p>
      ) : (
        <form action={saveCategories} className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {cats.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3"
              >
                <input type="hidden" name="ids" value={c.id} />
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-neutral-500">Nombre</span>
                  <input
                    name={`name-${c.id}`}
                    defaultValue={c.name}
                    required
                    className="rounded border border-neutral-300 px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-neutral-500">Orden</span>
                  <input
                    name={`sort_order-${c.id}`}
                    type="number"
                    min={1}
                    defaultValue={c.sort_order}
                    className="w-20 rounded border border-neutral-300 px-2 py-1"
                  />
                </label>
                <button
                  formAction={deleteCategory}
                  formNoValidate
                  name="id"
                  value={c.id}
                  className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
          <div>
            <button className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
              Guardar cambios
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
