"use client";

import { useState } from "react";
import { useActionState } from "react";
import Image from "next/image";
import { updateLocalSettings } from "@/app/admin/settings/actions";
import { initialSettingsState } from "@/app/admin/settings/state";
import { WeekHoursFields } from "@/components/admin/week-hours-fields";
import { ThemePicker } from "@/components/admin/theme-picker";
import type { WeekHours } from "@/lib/hours";
import type { LocalTheme } from "@/lib/theme";

type LocalValues = {
  name: string;
  currency: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  theme: LocalTheme;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  hours: WeekHours | null;
  googleReviewsEnabled: boolean;
  googleReviewUrl: string | null;
  deliveryOwnEnabled: boolean;
  deliveryOwnWhatsapp: string | null;
  deliveryUberUrl: string | null;
  deliveryRappiUrl: string | null;
  deliveryPedidosyaUrl: string | null;
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
  const [googleEnabled, setGoogleEnabled] = useState(local.googleReviewsEnabled);
  const [deliveryOwnEnabled, setDeliveryOwnEnabled] = useState(
    local.deliveryOwnEnabled,
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4"
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Datos generales</legend>

        <Text label="Nombre del local" name="name" defaultValue={local.name} required />

        <div className="flex flex-col gap-2">
          <span className="text-sm text-neutral-500">Avatar / logo</span>
          <div className="flex items-center gap-3">
            {local.avatarUrl ? (
              <Image
                src={local.avatarUrl}
                alt="Avatar del local"
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs text-neutral-400">
                sin foto
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              <input
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/webp"
                className="w-full max-w-full text-xs"
              />
              {local.avatarUrl && (
                <label className="flex items-center gap-2 text-xs text-neutral-600">
                  <input type="checkbox" name="remove_avatar" />
                  Quitar avatar
                </label>
              )}
              <span className="text-xs text-neutral-400">JPG/PNG/WebP, máx. 3 MB</span>
            </div>
          </div>
        </div>

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
        <legend className="text-sm font-medium">Colores del menú público</legend>
        <p className="text-xs text-neutral-500">
          Elegí una paleta lista para usar, o tocá cada color para
          personalizarlo. Se ve al momento en la vista previa de abajo.
        </p>
        <ThemePicker initialTheme={local.theme} />

        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
          <span className="text-sm text-neutral-500">Banner (opcional)</span>
          <div className="flex items-center gap-3">
            {local.bannerUrl ? (
              <Image
                src={local.bannerUrl}
                alt="Banner del local"
                width={96}
                height={54}
                className="h-14 w-24 shrink-0 rounded object-cover"
              />
            ) : (
              <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400">
                sin imagen
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              <input
                type="file"
                name="banner"
                accept="image/jpeg,image/png,image/webp"
                className="w-full max-w-full text-xs"
              />
              {local.bannerUrl && (
                <label className="flex items-center gap-2 text-xs text-neutral-600">
                  <input type="checkbox" name="remove_banner" />
                  Quitar imagen
                </label>
              )}
              <span className="text-xs text-neutral-400">
                Sin texto encima. Máx. 3 MB
              </span>
            </div>
          </div>
        </div>
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

        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="google_reviews_enabled"
              defaultChecked={googleEnabled}
              onChange={(e) => setGoogleEnabled(e.target.checked)}
            />
            Mostrar link para dejar reseña en Google
          </label>
          <p className="text-xs text-neutral-500">
            Marcalo solo si tu local está registrado en Google (Google Business
            Profile / Maps) con el nombre del comercio. Para conseguir el link:
            en tu perfil de Google Business → “Pedir reseñas” → copiar enlace; o
            en Google Maps, buscá el local → “Escribir una opinión” → copiar el
            link de esa pantalla.
          </p>
          <Text
            label="URL de reseña de Google"
            name="google_review_url"
            defaultValue={local.googleReviewUrl ?? ""}
            placeholder="https://g.page/r/…/review"
            dimmed={!googleEnabled}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Horario de atención</legend>
        <p className="text-xs text-neutral-500">
          Dejá vacío un día que no quieras mostrar, o marcá “Cerrado”. En el menú
          público aparece plegado.
        </p>
        <WeekHoursFields defaultValue={local.hours} />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Delivery</legend>
        <p className="text-xs text-neutral-500">
          Se muestra al final del menú público. Dejá vacío lo que no uses.
        </p>

        <div className="flex flex-col gap-2 border-b border-neutral-100 pb-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="delivery_own_enabled"
              defaultChecked={deliveryOwnEnabled}
              onChange={(e) => setDeliveryOwnEnabled(e.target.checked)}
            />
            Hacemos delivery propio (pedidos por WhatsApp)
          </label>
          <Text
            label="WhatsApp para pedidos"
            name="delivery_own_whatsapp"
            defaultValue={local.deliveryOwnWhatsapp ?? ""}
            placeholder="Vacío = usa el WhatsApp de arriba"
            inputMode="tel"
            dimmed={!deliveryOwnEnabled}
          />
        </div>

        <Text
          label="Link de Uber Eats"
          name="delivery_uber_url"
          defaultValue={local.deliveryUberUrl ?? ""}
          placeholder="https://…"
        />
        <Text
          label="Link de Rappi"
          name="delivery_rappi_url"
          defaultValue={local.deliveryRappiUrl ?? ""}
          placeholder="https://…"
        />
        <Text
          label="Link de PedidosYa"
          name="delivery_pedidosya_url"
          defaultValue={local.deliveryPedidosyaUrl ?? ""}
          placeholder="https://…"
        />
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
  dimmed,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "tel" | "text";
  // Visualmente "apagado" mientras el checkbox que lo gobierna está destildado,
  // pero SIN `disabled`: un input disabled no se envía al guardar y borraría
  // el valor guardado apenas se apretara "Guardar" con el checkbox destildado.
  // `readOnly` bloquea la edición pero sigue viajando en el form.
  dimmed?: boolean;
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
        readOnly={dimmed}
        aria-disabled={dimmed}
        className={
          "rounded border border-neutral-300 px-2 py-1" +
          (dimmed ? " bg-neutral-50 text-neutral-400" : "")
        }
      />
    </label>
  );
}
