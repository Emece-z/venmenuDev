"use client";

import { useActionState } from "react";
import { updateLocalSettings } from "@/app/admin/settings/actions";
import { initialSettingsState } from "@/app/admin/settings/state";
import { WeekHoursFields } from "@/components/admin/week-hours-fields";
import type { WeekHours } from "@/lib/hours";

type LocalValues = {
  name: string;
  currency: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  hours: WeekHours | null;
};

export function SettingsForm({
  local,
  currencyOptions,
  zeroDecimal,
}: {
  local: LocalValues;
  currencyOptions: string[];
  zeroDecimal: string[];
}) {
  const [state, action, pending] = useActionState(
    updateLocalSettings,
    initialSettingsState,
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4"
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Datos generales</legend>

        <Text label="Nombre del local" name="name" defaultValue={local.name} required />

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Moneda</span>
          <select
            name="currency"
            defaultValue={local.currency}
            className="rounded border border-neutral-300 px-2 py-1"
          >
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
                {zeroDecimal.includes(c) ? " (sin decimales)" : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-amber-700">
            ⚠ Cambiar entre una moneda sin decimales (CLP) y una con decimales
            (USD, ARS…) altera cómo se leen los precios ya cargados.
          </span>
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Página pública del menú</legend>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">
            Bienvenida / descripción breve
          </span>
          <textarea
            name="description"
            rows={3}
            maxLength={600}
            defaultValue={local.description ?? ""}
            placeholder="Ej. Café de especialidad en el centro. Pastelería propia todos los días."
            className="rounded border border-neutral-300 px-2 py-1"
          />
        </label>

        <Text
          label="Dirección"
          name="address"
          defaultValue={local.address ?? ""}
          placeholder="Av. Siempre Viva 742, Santiago"
        />
        <Text
          label="Teléfono"
          name="phone"
          defaultValue={local.phone ?? ""}
          placeholder="+56 2 2345 6789"
          inputMode="tel"
        />
        <Text
          label="WhatsApp"
          name="whatsapp"
          defaultValue={local.whatsapp ?? ""}
          placeholder="+56 9 1234 5678"
          inputMode="tel"
        />
        <Text
          label="Instagram"
          name="instagram"
          defaultValue={local.instagram ?? ""}
          placeholder="@tulocal"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Horario de atención</legend>
        <p className="text-xs text-neutral-500">
          Dejá vacío un día que no quieras mostrar, o marcá “Cerrado”. En el menú
          público aparece plegado.
        </p>
        <WeekHoursFields defaultValue={local.hours} />
      </fieldset>

      <div className="flex items-center gap-3">
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
  );
}

function Text({
  label,
  name,
  defaultValue,
  required,
  placeholder,
  inputMode,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "tel" | "text";
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        className="rounded border border-neutral-300 px-2 py-1"
      />
    </label>
  );
}
