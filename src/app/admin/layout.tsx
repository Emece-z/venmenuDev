import Image from "next/image";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";

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
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
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
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-1.5 sm:flex">
              <Image src="/logo-icon.png" alt="" width={16} height={16} />
              <span className="text-xs font-medium text-neutral-400">
                <span className="text-brand-navy">Ven</span>
                <span className="text-brand-orange">Menu</span>
              </span>
            </div>
            <form action="/auth/signout" method="post">
              <button className="text-xs text-neutral-600 underline">
                Salir
              </button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
