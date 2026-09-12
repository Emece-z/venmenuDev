import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { DAYS, dayHoursLabel, parseWeekHours } from "@/lib/hours";
import { DEFAULT_THEME } from "@/lib/theme";
import {
  WhatsAppIcon,
  InstagramIcon,
  GoogleIcon,
  PinIcon,
} from "@/components/brand-icons";

// Página pública del menú. Sin login. Se abre al acercar el NFC o escanear el QR.
// Renderizada en el servidor (rápida, sin JS de cliente). Los datos se leen con
// la anon key: RLS solo deja ver locales activos y menús publicados, así que un
// local suspendido cae en notFound() automáticamente.
export const revalidate = 30; // cache de 30s: el menú no cambia a cada request

// Título de la pestaña = nombre del local (en vez del "VenMenu" genérico del
// layout raíz). Consulta liviana aparte: generateMetadata corre por separado
// de la página y no puede reusar los datos que esta pide más abajo.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: local } = await supabase
    .from("locals")
    .select("name")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  return { title: local?.name ?? "VenMenu" };
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: local } = await supabase
    .from("locals")
    .select(
      "id, name, currency, avatar_url, banner_url, theme_bg, theme_text, theme_accent, description, phone, whatsapp, instagram, hours, google_reviews_enabled, google_review_url, delivery_uber_url, delivery_rappi_url, delivery_pedidosya_url, delivery_own_enabled, delivery_own_whatsapp",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!local) notFound();

  const { data: addresses } = await supabase
    .from("local_addresses")
    .select("id, label, address")
    .eq("local_id", local.id)
    .order("sort_order", { ascending: true });

  const { data: menu } = await supabase
    .from("menus")
    .select("id")
    .eq("local_id", local.id)
    .eq("is_published", true)
    .limit(1)
    .single();

  if (!menu) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("menu_id", menu.id)
    .order("sort_order", { ascending: true });

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, description, price_cents, category_id, sort_order, image_url",
    )
    .eq("menu_id", menu.id)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  const byCategory = groupByCategory(categories ?? [], products ?? []);

  const googleReviewUrl =
    local.google_reviews_enabled && local.google_review_url
      ? local.google_review_url
      : null;
  const hasContact =
    (addresses && addresses.length > 0) ||
    local.phone ||
    local.whatsapp ||
    local.instagram ||
    googleReviewUrl;
  const deliveryWaDigits = (local.delivery_own_whatsapp || local.whatsapp || "").replace(
    /\D/g,
    "",
  );
  const ownDeliveryWa =
    local.delivery_own_enabled && deliveryWaDigits
      ? `https://wa.me/${deliveryWaDigits}?text=${encodeURIComponent(
          "Hola, quiero hacer un pedido para delivery",
        )}`
      : null;
  const hasDelivery =
    local.delivery_uber_url ||
    local.delivery_rappi_url ||
    local.delivery_pedidosya_url ||
    ownDeliveryWa;
  const week = parseWeekHours(local.hours);
  const hasHeader = hasContact || local.description || week;
  const theme = {
    bg: local.theme_bg ?? DEFAULT_THEME.bg,
    text: local.theme_text ?? DEFAULT_THEME.text,
    accent: local.theme_accent ?? DEFAULT_THEME.accent,
  };

  return (
    <main
      className="mx-auto min-h-dvh max-w-md bg-[var(--menu-bg)] px-4 py-6 text-[var(--menu-text)]"
      style={
        {
          "--menu-bg": theme.bg,
          "--menu-text": theme.text,
          "--menu-accent": theme.accent,
        } as React.CSSProperties
      }
    >
      {local.banner_url && (
        <div className="relative -mx-4 -mt-6 mb-4 h-32 w-[calc(100%+2rem)] overflow-hidden sm:rounded-b-lg">
          <Image src={local.banner_url} alt="" fill className="object-cover" priority />
        </div>
      )}
      <header
        className={
          "border-[color:var(--menu-text)]/10" +
          (hasHeader ? " border-b pb-5" : "")
        }
      >
        <div className="flex items-center gap-3">
          {local.avatar_url && (
            <Image
              src={local.avatar_url}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full border-4 border-[var(--menu-bg)] object-cover"
            />
          )}
          <h1 className="text-xl font-semibold">{local.name}</h1>
        </div>
        {local.description && (
          <p className="mt-2 text-sm opacity-70">{local.description}</p>
        )}
        {hasContact && (
          <div className="mt-3 flex flex-col gap-2 text-sm opacity-80">
            {addresses && addresses.length > 0 && (
              <div className="flex flex-col gap-1">
                {addresses.map((a) => (
                  <a
                    key={a.id}
                    href={mapsHref(a.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 underline"
                  >
                    <PinIcon className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                    <span>
                      {a.label ? `${a.label}: ` : ""}
                      {a.address}
                    </span>
                  </a>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {local.phone && (
                <a href={telHref(local.phone)} className="underline">
                  {local.phone}
                </a>
              )}
              {local.whatsapp && waHref(local.whatsapp) && (
                <a
                  href={waHref(local.whatsapp) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                </a>
              )}
              {local.instagram && (
                <a
                  href={igHref(local.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white"
                >
                  <InstagramIcon className="h-4 w-4" />
                </a>
              )}
              {googleReviewUrl && (
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1"
                >
                  <GoogleIcon className="h-4 w-4" />
                  <span className="underline">¡Dejanos tu reseña!</span>
                </a>
              )}
            </div>
          </div>
        )}

        {week && (
          <details className="group mt-3 text-sm opacity-80">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
              <span className="underline">Horario de atención</span>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-open:rotate-180"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </summary>
            <ul className="mt-2 flex flex-col gap-0.5">
              {DAYS.map((d) => (
                <li key={d.key} className="flex justify-between gap-6">
                  <span>{d.label}</span>
                  <span className="tabular-nums">
                    {dayHoursLabel(week[d.key])}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </header>

      <div className="mt-6 flex flex-col">
        {byCategory.map((group, i) => (
          <details
            key={group.id}
            open={i === 0}
            className="group border-b border-[color:var(--menu-text)]/10 last:border-b-0"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--menu-accent)] [&::-webkit-details-marker]:hidden">
              <span>{group.name}</span>
              <span className="flex items-center gap-2 text-xs font-normal normal-case opacity-60">
                {group.items.length}
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-open:rotate-180"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </summary>
            <ul className="flex flex-col divide-y divide-[color:var(--menu-text)]/10 pb-2">
              {group.items.map((p) => (
                <li key={p.id} className="flex gap-3 py-3">
                  {p.image_url && (
                    <>
                      {/* Miniatura: salta al lightbox sin abrir pestaña ni
                          recargar la página (ancla a #foto-<id>, puro CSS). */}
                      <a
                        href={`#foto-${p.id}`}
                        className="block shrink-0"
                        aria-label={`Ver foto de ${p.name} más grande`}
                      >
                        <Image
                          src={p.image_url}
                          alt={p.name}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      </a>
                      <div id={`foto-${p.id}`} className="lightbox">
                        <a
                          href="#"
                          className="lightbox-backdrop"
                          aria-label="Cerrar"
                        />
                        <div className="lightbox-body">
                          <Image
                            src={p.image_url}
                            alt={p.name}
                            fill
                            sizes="640px"
                            className="lightbox-img"
                          />
                          <a href="#" className="lightbox-close" aria-label="Cerrar">
                            ✕
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    {p.description && (
                      <p className="mt-0.5 text-sm opacity-70">{p.description}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--menu-accent)]">
                    {formatPrice(p.price_cents, local.currency)}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ))}

        {byCategory.length === 0 && (
          <p className="text-sm opacity-70">
            Este menú todavía no tiene productos disponibles.
          </p>
        )}
      </div>

      {hasDelivery && (
        <div className="mt-8 border-t border-[color:var(--menu-text)]/10 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
            Delivery
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ownDeliveryWa && (
              <a
                href={ownDeliveryWa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Pedir por WhatsApp
              </a>
            )}
            {local.delivery_uber_url && (
              <a
                href={local.delivery_uber_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white"
              >
                Uber Eats
              </a>
            )}
            {local.delivery_rappi_url && (
              <a
                href={local.delivery_rappi_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-[#FF441F] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Rappi
              </a>
            )}
            {local.delivery_pedidosya_url && (
              <a
                href={local.delivery_pedidosya_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-[#E7352C] px-3 py-1.5 text-xs font-semibold text-white"
              >
                PedidosYa
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// Normalización de los datos de contacto a hrefs (se guardan tal cual los
// escribe el dueño y se interpretan acá).
function telHref(v: string): string {
  return `tel:${v.replace(/[^\d+]/g, "")}`;
}
function waHref(v: string): string | null {
  const digits = v.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}
function igHref(v: string): string {
  const t = v.trim();
  return /^https?:\/\//i.test(t)
    ? t
    : `https://instagram.com/${t.replace(/^@/, "")}`;
}
function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

type Cat = { id: string; name: string; sort_order: number };
type Prod = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category_id: string | null;
  sort_order: number;
  image_url: string | null;
};

function groupByCategory(categories: Cat[], products: Prod[]) {
  const groups = categories.map((c) => ({
    id: c.id,
    name: c.name,
    items: products.filter((p) => p.category_id === c.id),
  }));

  const uncategorized = products.filter((p) => !p.category_id);
  if (uncategorized.length > 0) {
    groups.push({ id: "none", name: "Otros", items: uncategorized });
  }

  return groups.filter((g) => g.items.length > 0);
}
