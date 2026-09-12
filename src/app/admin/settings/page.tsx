import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { planLabel, subStatusLabel } from "@/lib/plans";
import { parseWeekHours } from "@/lib/hours";
import { DEFAULT_THEME } from "@/lib/theme";
import { SettingsForm } from "@/components/admin/settings-form";
import { AddressesManager } from "@/components/admin/addresses-manager";

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
      "name, slug, status, currency, avatar_url, banner_url, theme_bg, theme_text, theme_accent, description, phone, whatsapp, instagram, hours, google_reviews_enabled, google_review_url, delivery_uber_url, delivery_rappi_url, delivery_pedidosya_url, delivery_own_enabled, delivery_own_whatsapp",
    )
    .eq("id", profile.local_id)
    .single();

  const { data: addresses } = await supabase
    .from("local_addresses")
    .select("id, label, address")
    .eq("local_id", profile.local_id)
    .order("sort_order", { ascending: true });

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
          avatarUrl: local?.avatar_url ?? null,
          bannerUrl: local?.banner_url ?? null,
          theme: {
            bg: local?.theme_bg ?? DEFAULT_THEME.bg,
            text: local?.theme_text ?? DEFAULT_THEME.text,
            accent: local?.theme_accent ?? DEFAULT_THEME.accent,
          },
          description: local?.description ?? null,
          phone: local?.phone ?? null,
          whatsapp: local?.whatsapp ?? null,
          instagram: local?.instagram ?? null,
          hours: parseWeekHours(local?.hours ?? null),
          googleReviewsEnabled: local?.google_reviews_enabled ?? false,
          googleReviewUrl: local?.google_review_url ?? null,
          deliveryOwnEnabled: local?.delivery_own_enabled ?? false,
          deliveryOwnWhatsapp: local?.delivery_own_whatsapp ?? null,
          deliveryUberUrl: local?.delivery_uber_url ?? null,
          deliveryRappiUrl: local?.delivery_rappi_url ?? null,
          deliveryPedidosyaUrl: local?.delivery_pedidosya_url ?? null,
        }}
        currencyOptions={currencyOptions}
        zeroDecimal={ZERO_DECIMAL}
      />

      <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <div>
          <h2 className="text-sm font-medium">Direcciones</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Se muestran en el menú público con un link directo a Google Maps.
            Agregá más de una si tenés varias sucursales.
          </p>
        </div>
        <AddressesManager addresses={addresses ?? []} />
      </section>

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
