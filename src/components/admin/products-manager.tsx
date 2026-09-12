"use client";

import { useActionState, useMemo, useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { centsToInput } from "@/lib/money";
import {
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
} from "@/app/admin/products/actions";
import { initialFormState } from "@/lib/form-state";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category_id: string | null;
  is_available: boolean;
  sort_order: number;
  image_url: string | null;
};

type SortKey = "name" | "category" | "price" | "available";
type SortDir = "asc" | "desc";

export function ProductsManager({
  products,
  categories,
  currency,
}: {
  products: Product[];
  categories: Category[];
  currency: string;
}) {
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all"); // all | <id> | none
  const [availFilter, setAvailFilter] = useState("all"); // all | available | hidden
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (m.get(id) ?? "—") : "Sin categoría");
  }, [categories]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = products.filter((p) => {
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      if (categoryFilter === "none" && p.category_id) return false;
      if (
        categoryFilter !== "all" &&
        categoryFilter !== "none" &&
        p.category_id !== categoryFilter
      )
        return false;
      if (availFilter === "available" && !p.is_available) return false;
      if (availFilter === "hidden" && p.is_available) return false;
      return true;
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sort.key) {
        case "price":
          return (a.price_cents - b.price_cents) * dir;
        case "available":
          return (Number(a.is_available) - Number(b.is_available)) * dir;
        case "category":
          return catName(a.category_id).localeCompare(catName(b.category_id)) * dir;
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
    return list;
  }, [products, q, categoryFilter, availFilter, sort, catName]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const arrow = (key: SortKey) =>
    sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="flex flex-col gap-3">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto…"
          className="w-full max-w-xs rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="none">Sin categoría</option>
        </select>
        <select
          value={availFilter}
          onChange={(e) => setAvailFilter(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="all">Disponibles y ocultos</option>
          <option value="available">Solo disponibles</option>
          <option value="hidden">Solo ocultos</option>
        </select>
        <span className="text-xs text-neutral-400">
          {rows.length} de {products.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <Th onClick={() => toggleSort("name")}>Nombre{arrow("name")}</Th>
              <Th onClick={() => toggleSort("category")}>
                Categoría{arrow("category")}
              </Th>
              <Th onClick={() => toggleSort("price")} className="text-right">
                Precio{arrow("price")}
              </Th>
              <Th onClick={() => toggleSort("available")}>
                Estado{arrow("available")}
              </Th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const editing = editingId === p.id;
              return (
                <Row
                  key={p.id}
                  p={p}
                  editing={editing}
                  currency={currency}
                  categories={categories}
                  catLabel={catName(p.category_id)}
                  onToggleEdit={() => setEditingId(editing ? null : p.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-neutral-500">
          {products.length === 0
            ? "Sin productos todavía."
            : "Ningún producto coincide con el filtro."}
        </p>
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th className={`py-2 pr-4 ${className}`}>
      <button
        onClick={onClick}
        className="font-medium text-neutral-500 hover:text-neutral-900"
      >
        {children}
      </button>
    </th>
  );
}

function Row({
  p,
  editing,
  currency,
  categories,
  catLabel,
  onToggleEdit,
}: {
  p: Product;
  editing: boolean;
  currency: string;
  categories: Category[];
  catLabel: string;
  onToggleEdit: () => void;
}) {
  const [state, action, pending] = useActionState(updateProduct, initialFormState);

  return (
    <>
      <tr className="border-b border-neutral-100 align-top">
        <td className="py-2 pr-4">
          <div className="flex items-center gap-2">
            {p.image_url ? (
              <Image
                src={p.image_url}
                alt={p.name}
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded object-cover"
              />
            ) : (
              <span className="h-9 w-9 shrink-0 rounded bg-neutral-100" />
            )}
            <span className="font-medium">{p.name}</span>
          </div>
        </td>
        <td className="py-2 pr-4 text-neutral-600">{catLabel}</td>
        <td className="py-2 pr-4 text-right tabular-nums">
          {formatPrice(p.price_cents, currency)}
        </td>
        <td className="py-2 pr-4">
          <span className={p.is_available ? "text-green-700" : "text-neutral-400"}>
            {p.is_available ? "disponible" : "oculto"}
          </span>
        </td>
        <td className="py-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onToggleEdit}
              className="rounded border border-neutral-300 px-2 py-1 text-xs"
            >
              {editing ? "Cerrar" : "Editar"}
            </button>
            <form action={toggleProductAvailability}>
              <input type="hidden" name="id" value={p.id} />
              <input
                type="hidden"
                name="next"
                value={(!p.is_available).toString()}
              />
              <button className="rounded border border-neutral-300 px-2 py-1 text-xs">
                {p.is_available ? "Ocultar" : "Mostrar"}
              </button>
            </form>
            <form
              action={deleteProduct}
              onSubmit={(e) => {
                if (!confirm(`¿Eliminar "${p.name}"?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={p.id} />
              <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">
                Eliminar
              </button>
            </form>
          </div>
        </td>
      </tr>

      {editing && (
        <tr className="border-b border-neutral-200 bg-neutral-50">
          <td colSpan={5} className="px-3 py-4">
            <form action={action} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={p.id} />
              <LabeledInput label="Nombre" name="name" defaultValue={p.name} required />
              <LabeledInput
                label={`Precio (${currency})`}
                name="price"
                defaultValue={centsToInput(p.price_cents, currency)}
                required
                inputMode="numeric"
              />
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-neutral-500">Descripción</span>
                <input
                  name="description"
                  defaultValue={p.description ?? ""}
                  className="rounded border border-neutral-300 px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-500">Categoría</span>
                <select
                  name="category_id"
                  defaultValue={p.category_id ?? ""}
                  className="rounded border border-neutral-300 px-2 py-1"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_available"
                  defaultChecked={p.is_available}
                />
                Disponible
              </label>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm text-neutral-500">Imagen</span>
                <div className="flex items-center gap-3">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400">
                      sin foto
                    </span>
                  )}
                  <div className="flex flex-col gap-1 text-sm">
                    <input
                      type="file"
                      name="image"
                      accept="image/jpeg,image/png,image/webp"
                      className="text-sm"
                    />
                    {p.image_url && (
                      <label className="flex items-center gap-2 text-xs text-neutral-600">
                        <input type="checkbox" name="remove_image" />
                        Quitar imagen actual
                      </label>
                    )}
                    <span className="text-xs text-neutral-400">
                      JPG/PNG/WebP, máx. 3 MB
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  disabled={pending}
                  className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Guardando…" : "Guardar"}
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
          </td>
        </tr>
      )}
    </>
  );
}

function LabeledInput({
  label,
  name,
  defaultValue,
  required,
  inputMode,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        inputMode={inputMode}
        className="rounded border border-neutral-300 px-2 py-1"
      />
    </label>
  );
}
