"use client";

import { useActionState } from "react";
import { createProduct } from "@/app/admin/products/actions";
import { initialFormState } from "@/lib/form-state";

type Category = { id: string; name: string };

export function CreateProductForm({
  categories,
  currency,
}: {
  categories: Category[];
  currency: string;
}) {
  const [state, action, pending] = useActionState(createProduct, initialFormState);

  return (
    <details className="rounded-lg border border-neutral-200 [&[open]>summary]:mb-3">
      <summary className="cursor-pointer list-none p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        + Nuevo producto
      </summary>
      <form action={action} className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
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
            className="rounded border border-neutral-300 px-2 py-1 outline-none focus:border-brand-navy"
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
            {categories.map((c) => (
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
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            disabled={pending}
            className="rounded bg-brand-navy px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Agregando…" : "Agregar producto"}
          </button>
          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
          {state.ok && !state.error && (
            <p className="text-sm text-green-700" role="status">
              Agregado ✓
            </p>
          )}
        </div>
      </form>
    </details>
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
        className="rounded border border-neutral-300 px-2 py-1 outline-none focus:border-brand-navy"
      />
    </label>
  );
}
