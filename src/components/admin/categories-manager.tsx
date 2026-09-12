"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createCategory,
  saveCategories,
  deleteCategory,
} from "@/app/admin/categories/actions";
import { initialFormState } from "@/lib/form-state";
import { GripIcon } from "@/components/admin/grip-icon";

type Category = { id: string; name: string; sort_order: number };

// El orden ya no se edita como número: se arrastra la fila. El `sort_order`
// que se manda al guardar es simplemente la posición en la lista (índice + 1),
// así nunca hay que "corregir" el número de otra categoría al reordenar.
export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [items, setItems] = useState(categories);
  useEffect(() => setItems(categories), [categories]);

  const [createState, createAction, createPending] = useActionState(
    createCategory,
    initialFormState,
  );
  const [saveState, saveAction, savePending] = useActionState(
    saveCategories,
    initialFormState,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Crear: se agrega siempre al final; después se arrastra a su lugar */}
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
        <input type="hidden" name="sort_order" value={items.length + 1} />
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
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin categorías todavía.</p>
      ) : (
        <form action={saveAction} className="flex flex-col gap-3">
          <p className="text-xs text-neutral-500">
            Arrastrá <span aria-hidden="true">⠿</span> para cambiar el orden en
            que aparecen en el menú público.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-2">
                {items.map((c, index) => (
                  <SortableRow key={c.id} category={c} index={index} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
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

function SortableRow({ category, index }: { category: Category; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar para reordenar ${category.name}`}
        className="shrink-0 touch-none rounded px-1 py-1 text-neutral-400 hover:text-neutral-600 active:cursor-grabbing"
      >
        <GripIcon />
      </button>
      <input type="hidden" name="ids" value={category.id} />
      <input type="hidden" name={`sort_order-${category.id}`} value={index + 1} />
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="sr-only">Nombre</span>
        <input
          name={`name-${category.id}`}
          defaultValue={category.name}
          required
          className="w-full rounded border border-neutral-300 px-2 py-1"
        />
      </label>
      <button
        formAction={deleteCategory.bind(null, category.id)}
        formNoValidate
        className="shrink-0 rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
      >
        Eliminar
      </button>
    </li>
  );
}
