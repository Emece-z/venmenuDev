"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import {
  createAddress,
  saveAddresses,
  deleteAddress,
} from "@/app/admin/settings/actions";
import { initialFormState } from "@/lib/form-state";

type Address = { id: string; label: string | null; address: string };

// Direcciones del local: se muestran en el menú público con un link directo
// a Google Maps. Un local con varias sucursales puede cargar más de una.
// Mismo patrón que CategoriesManager (crear al final + un "Guardar" para
// todas las filas), sin arrastre: el orden de carga alcanza acá.
export function AddressesManager({ addresses }: { addresses: Address[] }) {
  const [items, setItems] = useState(addresses);
  useEffect(() => setItems(addresses), [addresses]);

  const [createState, createAction, createPending] = useActionState(
    createAddress,
    initialFormState,
  );
  const [saveState, saveAction, savePending] = useActionState(
    saveAddresses,
    initialFormState,
  );

  return (
    <div className="flex flex-col gap-4">
      <form
        action={createAction}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Etiqueta (opcional)</span>
          <input
            name="label"
            placeholder="Ej. Sucursal Centro"
            className="w-full max-w-full rounded border border-neutral-300 px-2 py-1 outline-none focus:border-brand-navy"
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="text-neutral-500">Dirección</span>
          <input
            name="address"
            required
            placeholder="Av. Siempre Viva 742, Santiago"
            className="w-full max-w-full rounded border border-neutral-300 px-2 py-1 outline-none focus:border-brand-navy"
          />
        </label>
        <button
          disabled={createPending}
          className="shrink-0 rounded bg-brand-navy px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {createPending ? "Agregando…" : "Agregar"}
        </button>
        {createState.error && (
          <p className="w-full text-sm text-red-600" role="alert">
            {createState.error}
          </p>
        )}
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin direcciones todavía.</p>
      ) : (
        <form action={saveAction} className="flex flex-col gap-2">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3"
            >
              <input type="hidden" name="ids" value={a.id} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-500">Etiqueta</span>
                <input
                  name={`label-${a.id}`}
                  defaultValue={a.label ?? ""}
                  className="w-full max-w-full rounded border border-neutral-300 px-2 py-1 outline-none focus:border-brand-navy"
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <span className="text-neutral-500">Dirección</span>
                <input
                  name={`address-${a.id}`}
                  defaultValue={a.address}
                  required
                  className="w-full max-w-full rounded border border-neutral-300 px-2 py-1 outline-none focus:border-brand-navy"
                />
              </label>
              <button
                formAction={deleteAddress.bind(null, a.id)}
                formNoValidate
                className="shrink-0 rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
              >
                Eliminar
              </button>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button
              disabled={savePending}
              className="rounded bg-brand-navy px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {savePending ? "Guardando…" : "Guardar direcciones"}
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
