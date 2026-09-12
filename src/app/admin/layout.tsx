import type { Metadata } from "next";
import Image from "next/image";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";

// Título de pestaña = nombre del local (con requireOwner() ya resuelto,
// consulta liviana aparte: generateMetadata corre por separado del layout y
// no puede reusar los datos que este pide más abajo — mismo patrón que
// /m/[slug]).
export async function generateMetadata(): Promise<Metadata> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data: local } = await supabase
    .from("locals")
    .select("name")
    .eq("id", profile.local_id)
    .single();

  return { title: local?.name ?? "Admin" };
}

// Shell del panel del dueño de local. `requireOwner()` es la segunda barrera
// (el middleware ya filtró por área); además carga el local para el header.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const { data: local } = await supabase
    .from("locals")
    .select("name, slug, status, avatar_url")
    .eq("id", profile.local_id)
    .single();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-neutral-200">
        {/* Franja propia (no comparte fila con el avatar/nombre del local ni
            con "Salir"): así se ve también en mobile, sin apretar el resto. */}
        <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-4 pt-2 text-xs font-medium text-neutral-400">
          <Image src="/logo-icon.png" alt="" width={14} height={14} />
          <span className="text-brand-navy">Ven</span>
          <span className="-ml-1.5 text-brand-orange">Menu</span>
        </div>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pb-3 pt-1.5">
          <div className="flex min-w-0 items-center gap-2">
            {local?.avatar_url && (
              <Image
                src={local.avatar_url}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {local?.name ?? "Mi local"}
              </p>
              <p className="truncate text-xs text-neutral-500">
                /m/{local?.slug}
                {local?.status === "suspended" && (
                  <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-red-700">
                    suspendido
                  </span>
                )}
              </p>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button className="shrink-0 text-xs text-neutral-600 underline">
              Salir
            </button>
          </form>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
