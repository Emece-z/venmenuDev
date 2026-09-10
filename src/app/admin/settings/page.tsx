import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { planLabel, subStatusLabel } from "@/lib/plans";
import { updateLocalSettings } from "./actions";

// Monedas frecuentes en la región + algunas globales. Si el local ya tiene una
// que no está en la lista, se agrega al principio para no perderla.
const COMMON_CURRENCIES = [
  "CLP",
  "ARS",
  "PEN",
  "COP",
  "MXN",
  "BRL",
  "UYU",
  "PYG",
  "USD",
  "EUR",
];

// CLP/JPY/KRW/PYG no usan decimales; el resto sí (ver src/lib/money.ts).
const ZERO_DECIMAL = new Set(["CLP", "JPY", "KRW", "PYG"]);

export default async function SettingsPage() {
  const profile = await requireOwner();
  const supabase = await createClient();

  const { data: local } = await supabase
    .from("locals")
    .select("name, slug, status, currency, created_at")
    .eq("id", profile.local_id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, plan, current_period_end")
    .eq("local_id", profile.local_id)
    .single();

  const currency = local?.currency ?? "CLP";
  const currencyOptions = COMMON_CURRENCIES.includes(currency)
    ? COMMON_CURRENCIES
    : [currency, ...COMMON_CURRENCIES];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Ajustes</h1>

      {/* Editable */}
      <form
        action={updateLocalSettings}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Nombre del local</span>
          <input
            name="name"
            defaultValue={local?.name ?? ""}
            required
            className="rounded border border-neutral-300 px-2 py-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Moneda</span>
          <select
            name="currency"
            defaultValue={currency}
            className="rounded border border-neutral-300 px-2 py-1"
          >
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
                {ZERO_DECIMAL.has(c) ? " (sin decimales)" : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-amber-700">
            ⚠ Cambiar entre una moneda sin decimales (CLP) y una con decimales
            (USD, ARS…) altera cómo se leen los precios ya cargados. Revisá los
            productos después de cambiarla.
          </span>
        </label>

        <button className="mt-1 self-start rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
          Guardar
        </button>
      </form>

      {/* Solo lectura */}
      <dl className="rounded-lg border border-neutral-200 p-4 text-sm">
        <Row k="URL pública" v={local ? `/m/${local.slug}` : undefined} />
        <Row k="Estado del local" v={local?.status} />
        <Row
          k="Suscripción"
          v={subscription ? subStatusLabel(subscription.status) : undefined}
        />
        <Row
          k="Plan"
          v={subscription ? planLabel(subscription.plan) : undefined}
        />
      </dl>

      <p className="text-xs text-neutral-500">
        El slug de la URL, el estado del local y la suscripción los gestiona el
        administrador de la plataforma.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-neutral-500">{k}</dt>
      <dd className="font-medium">{v ?? "—"}</dd>
    </div>
  );
}
