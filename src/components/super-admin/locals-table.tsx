"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  setLocalStatus,
  updateLocal,
  updateSubscription,
} from "@/app/super-admin/actions";
import { initialFormState } from "@/lib/form-state";
import {
  PLANS,
  planLabel,
  SUBSCRIPTION_STATUSES,
  subStatusLabel,
} from "@/lib/plans";

export type LocalRow = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  status: "active" | "suspended";
  plan: string;
  subStatus: string;
  productCount: number;
  isPublished: boolean;
};

export function LocalsTable({ locals }: { locals: LocalRow[] }) {
  const [q, setQ] = useState("");
  const [onlySuspended, setOnlySuspended] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return locals.filter((l) => {
      if (onlySuspended && l.status !== "suspended") return false;
      if (!needle) return true;
      return (
        l.name.toLowerCase().includes(needle) ||
        l.slug.toLowerCase().includes(needle)
      );
    });
  }, [locals, q, onlySuspended]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o slug…"
          className="w-full max-w-xs rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1.5 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={onlySuspended}
            onChange={(e) => setOnlySuspended(e.target.checked)}
          />
          Solo suspendidos
        </label>
        <span className="text-xs text-neutral-400">
          {filtered.length} de {locals.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4">Local</th>
              <th className="py-2 pr-4">Productos</th>
              <th className="py-2 pr-4">Menú</th>
              <th className="py-2 pr-4">Suscripción</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const editing = editingId === l.id;
              return (
                <FragmentRow
                  key={l.id}
                  l={l}
                  editing={editing}
                  onToggleEdit={() =>
                    setEditingId(editing ? null : l.id)
                  }
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-neutral-500">
          {locals.length === 0
            ? "No hay locales todavía. Creá el primero con el formulario de arriba."
            : "Ningún local coincide con el filtro."}
        </p>
      )}
    </div>
  );
}

function FragmentRow({
  l,
  editing,
  onToggleEdit,
}: {
  l: LocalRow;
  editing: boolean;
  onToggleEdit: () => void;
}) {
  const [localState, localAction, localPending] = useActionState(
    updateLocal,
    initialFormState,
  );
  const [subState, subAction, subPending] = useActionState(
    updateSubscription,
    initialFormState,
  );

  return (
    <>
      <tr className="border-b border-neutral-100 align-top">
        <td className="py-2 pr-4">
          <div className="font-medium">{l.name}</div>
          <Link
            href={`/m/${l.slug}`}
            target="_blank"
            className="text-xs text-neutral-500 underline"
          >
            /m/{l.slug}
          </Link>
        </td>
        <td className="py-2 pr-4 tabular-nums">{l.productCount}</td>
        <td className="py-2 pr-4">
          <span className={l.isPublished ? "text-green-700" : "text-neutral-400"}>
            {l.isPublished ? "publicado" : "oculto"}
          </span>
        </td>
        <td className="py-2 pr-4">
          {subStatusLabel(l.subStatus)} · {planLabel(l.plan)}
        </td>
        <td className="py-2 pr-4">
          <span
            className={
              l.status === "active" ? "text-green-700" : "text-red-700"
            }
          >
            {l.status === "active" ? "activo" : "suspendido"}
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
            <a
              href={`/api/qr?slug=${l.slug}`}
              download={`qr-${l.slug}.png`}
              className="rounded border border-neutral-300 px-2 py-1 text-xs"
            >
              QR
            </a>
            <form action={setLocalStatus}>
              <input type="hidden" name="localId" value={l.id} />
              <input
                type="hidden"
                name="status"
                value={l.status === "active" ? "suspended" : "active"}
              />
              <button className="rounded border border-neutral-300 px-2 py-1 text-xs">
                {l.status === "active" ? "Suspender" : "Reactivar"}
              </button>
            </form>
          </div>
        </td>
      </tr>

      {editing && (
        <tr className="border-b border-neutral-200 bg-neutral-50">
          <td colSpan={6} className="px-3 py-4">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Datos del local */}
              <form action={localAction} className="flex flex-col gap-2">
                <p className="text-sm font-medium">Datos del local</p>
                <input type="hidden" name="localId" value={l.id} />
                <LabeledInput label="Nombre" name="name" defaultValue={l.name} required />
                <LabeledInput
                  label="Slug (URL pública)"
                  name="slug"
                  defaultValue={l.slug}
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                />
                <p className="text-xs text-amber-700">
                  ⚠ Cambiar el slug rompe los QR/NFC ya impresos que apuntan al
                  slug anterior.
                </p>
                <LabeledInput
                  label="Moneda"
                  name="currency"
                  defaultValue={l.currency}
                />
                <div className="mt-1 flex items-center gap-3">
                  <button
                    disabled={localPending}
                    className="self-start rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {localPending ? "Guardando…" : "Guardar datos"}
                  </button>
                  {localState.error && (
                    <p className="text-sm text-red-600" role="alert">
                      {localState.error}
                    </p>
                  )}
                  {localState.ok && !localState.error && (
                    <p className="text-sm text-green-700" role="status">
                      Guardado ✓
                    </p>
                  )}
                </div>
              </form>

              {/* Suscripción */}
              <form action={subAction} className="flex flex-col gap-2">
                <p className="text-sm font-medium">Suscripción</p>
                <input type="hidden" name="localId" value={l.id} />
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-neutral-500">Plan</span>
                  <select
                    name="plan"
                    defaultValue={
                      (PLANS as readonly string[]).includes(l.plan)
                        ? l.plan
                        : "basico"
                    }
                    className="rounded border border-neutral-300 px-2 py-1"
                  >
                    {PLANS.map((p) => (
                      <option key={p} value={p}>
                        {planLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-neutral-500">Estado</span>
                  <select
                    name="status"
                    defaultValue={l.subStatus}
                    className="rounded border border-neutral-300 px-2 py-1"
                  >
                    {SUBSCRIPTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {subStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <button
                    disabled={subPending}
                    className="self-start rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {subPending ? "Guardando…" : "Guardar suscripción"}
                  </button>
                  {subState.error && (
                    <p className="text-sm text-red-600" role="alert">
                      {subState.error}
                    </p>
                  )}
                  {subState.ok && !subState.error && (
                    <p className="text-sm text-green-700" role="status">
                      Guardado ✓
                    </p>
                  )}
                </div>
              </form>
            </div>
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
  pattern,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  pattern?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        pattern={pattern}
        className="rounded border border-neutral-300 px-2 py-1"
      />
    </label>
  );
}
