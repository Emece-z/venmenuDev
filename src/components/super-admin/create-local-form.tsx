"use client";

import { useActionState } from "react";
import { createLocalWithOwner } from "@/app/super-admin/actions";
import { initialFormState } from "@/lib/form-state";
import { PLANS, planLabel } from "@/lib/plans";

export function CreateLocalForm() {
  const [state, action, pending] = useActionState(
    createLocalWithOwner,
    initialFormState,
  );

  return (
    <form
      action={action}
      className="grid gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-2"
    >
      <p className="text-sm text-neutral-500 sm:col-span-2">
        Crea el local y su usuario dueño en un paso. El menú y la suscripción
        se generan solos.
      </p>
      <Field label="Nombre del local" name="name" required placeholder="Café Central" />
      <Field
        label="Slug (URL pública /m/…)"
        name="slug"
        required
        placeholder="cafe-central"
        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
      />
      <Field label="Moneda" name="currency" defaultValue="CLP" placeholder="CLP" />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500">Plan</span>
        <select
          name="plan"
          defaultValue="basico"
          className="rounded border border-neutral-300 px-2 py-1"
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {planLabel(p)}
            </option>
          ))}
        </select>
      </label>
      <Field label="Nombre del dueño (opcional)" name="full_name" placeholder="Ana Pérez" />
      <Field
        label="Email del dueño"
        name="email"
        type="email"
        required
        placeholder="dueno@ejemplo.com"
      />
      <Field
        label="Contraseña inicial (mín. 8)"
        name="password"
        type="password"
        required
        minLength={8}
      />
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          disabled={pending}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear local"}
        </button>
        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state.ok && !state.error && (
          <p className="text-sm text-green-700" role="status">
            Local creado ✓
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  pattern,
  minLength,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  pattern?: string;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        pattern={pattern}
        minLength={minLength}
        className="rounded border border-neutral-300 px-2 py-1"
      />
    </label>
  );
}
