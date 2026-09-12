"use client";

import { useActionState } from "react";
import {
  createCategory,
  saveCategories,
  deleteCategory,
} from "@/app/admin/categories/actions";
import { initialFormState } from "@/lib/form-state";

type Category = { id: string; name: string; sort_order: number };

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [createState, createAction, createPending] = useActionState(
    createCategory,
    initialFormState,
  );
  const [saveState, saveAction, savePending] = useActionState(
    saveCategories,
    initialFormState,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Crear */}
      <form
        action={createAction}
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
            defaultValue={categories.length + 1}
            className="w-20 rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <button
          disabled={createPending}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {createPending ? "Agregando…" : "Agregar"}
        </button>
        {createState.error && (
          <p className="text-sm text-red-600" role="alert">
            {createState.error}
          </p>
        )}
        {createState.ok && !createState.error && (
          <p className="text-sm text-green-700" role="status">
            Agregada ✓
          </p>
        )}
      </form>

      {/* Listar + editar: un solo formulario, un solo botón "Guardar" */}
      {categories.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin categorías todavía.</p>
      ) : (
        <form action={saveAction} className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {categories.map((c) => (
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
                  formAction={deleteCategory.bind(null, c.id)}
                  formNoValidate
                  className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <button
              disabled={savePending}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {savePending ? "Guardando…" : "Guardar cambios"}
            </button>
            {saveState.error && (
              <p className="text-sm text-red-600" role="alert">
                {saveState.error}
              </p>
            )}
            {saveState.ok && !saveState.error && (
              <p className="text-sm text-green-700" role="status">
                Guardado ✓
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
