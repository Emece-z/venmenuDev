"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
import { saveProductOrder } from "@/app/admin/products/actions";
import { initialFormState } from "@/lib/form-state";
import { GripIcon } from "@/components/admin/grip-icon";

type Category = { id: string; name: string };
type Product = { id: string; name: string; category_id: string | null };

// Arrastrar para reordenar, agrupado por categoría — el arrastre solo
// reordena DENTRO de una categoría (mezclar categorías se hace editando el
// producto, no arrastrando). El `sort_order` que se guarda es la posición
// final en la lista completa (índice + 1): como la vista pública agrupa por
// categoría primero, un contador global funciona igual que uno por categoría.
export function ReorderProducts({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [items, setItems] = useState(products);
  useEffect(() => setItems(products), [products]);

  const [state, action, pending] = useActionState(
    saveProductOrder,
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
      const activeItem = prev.find((p) => p.id === active.id);
      const overItem = prev.find((p) => p.id === over.id);
      if (!activeItem || !overItem) return prev;
      if ((activeItem.category_id ?? "none") !== (overItem.category_id ?? "none")) {
        return prev; // no se mezclan categorías arrastrando
      }
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  const groups = useMemo(() => {
    const byCat = new Map<string, Product[]>();
    for (const p of items) {
      const key = p.category_id ?? "none";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(p);
    }
    const result: { key: string; label: string; items: Product[] }[] = [];
    for (const c of categories) {
      const list = byCat.get(c.id);
      if (list && list.length > 0) result.push({ key: c.id, label: c.name, items: list });
    }
    const none = byCat.get("none");
    if (none && none.length > 0) {
      result.push({ key: "none", label: "Sin categoría", items: none });
    }
    return result;
  }, [items, categories]);

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">Sin productos todavía.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-xs text-neutral-500">
        Arrastrá <span aria-hidden="true">⠿</span> para cambiar el orden{" "}
        <strong>dentro de cada categoría</strong> — es el orden en que se ven
        en el menú público.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {groups.map((g) => (
          <div key={g.key} className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {g.label}
            </p>
            <SortableContext
              items={g.items.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-2">
                {g.items.map((p) => (
                  <SortableProductRow key={p.id} product={p} />
                ))}
              </ul>
            </SortableContext>
          </div>
        ))}
      </DndContext>

      {/* Orden final (ya arrastrado) para saveProductOrder */}
      {items.map((p) => (
        <input key={p.id} type="hidden" name="ids" value={p.id} />
      ))}

      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          className="self-start rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar orden"}
        </button>
        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state.ok && !state.error && (
          <p className="text-sm text-green-700" role="status">
            Guardado ✓
          </p>
        )}
      </div>
    </form>
  );
}

function SortableProductRow({ product }: { product: Product }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 text-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar para reordenar ${product.name}`}
        className="shrink-0 touch-none rounded px-1 py-1 text-neutral-400 hover:text-neutral-600 active:cursor-grabbing"
      >
        <GripIcon />
      </button>
      <span className="flex-1 truncate">{product.name}</span>
    </li>
  );
}
