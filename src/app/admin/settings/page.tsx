import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { planLabel, subStatusLabel } from "@/lib/plans";
import { parseWeekHours } from "@/lib/hours";
import { SettingsForm } from "@/components/admin/settings-form";

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

// CLP/JPY/KRW/PYG no usan decimales (ver src/lib/money.ts).
const ZERO_DECIMAL = ["CLP", "JPY", "KRW", "PYG"];

export default async function SettingsPage() {
  const profile = await requireOwner();
  const supabase = await createClient();

  const { data: local } = await supabase
    .from("locals")
    .select(
      "name, slug, status, currency, description, address, phone, whatsapp, instagram, hours, google_reviews_enabled, google_review_url",
    )
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

      <SettingsForm
        local={{
          name: local?.name ?? "",
          currency,
          description: local?.description ?? null,
          address: local?.address ?? null,
          phone: local?.phone ?? null,
          whatsapp: local?.whatsapp ?? null,
          instagram: local?.instagram ?? null,
          hours: parseWeekHours(local?.hours ?? null),
          googleReviewsEnabled: local?.google_reviews_enabled ?? false,
          googleReviewUrl: local?.google_review_url ?? null,
        }}
        currencyOptions={currencyOptions}
        zeroDecimal={ZERO_DECIMAL}
      />

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
