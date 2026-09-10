import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Ajustes</h1>

      <dl className="rounded-lg border border-neutral-200 p-4 text-sm">
        <Row k="Nombre" v={local?.name} />
        <Row k="URL pública" v={local ? `/m/${local.slug}` : undefined} />
        <Row k="Moneda" v={local?.currency} />
        <Row k="Estado del local" v={local?.status} />
        <Row k="Suscripción" v={subscription?.status} />
        <Row k="Plan" v={subscription?.plan} />
      </dl>

      <p className="text-xs text-neutral-500">
        Editar nombre/slug y gestionar el cobro llegan en pasos posteriores. La
        suscripción hoy solo la ajusta el super-admin.
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
