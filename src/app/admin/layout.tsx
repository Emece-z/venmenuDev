import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
    .select("name, slug, status")
    .eq("id", profile.local_id)
    .single();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
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
          <form action="/auth/signout" method="post">
            <button className="text-xs text-neutral-600 underline">
              Salir
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-4 px-4 pb-2 text-sm">
          <Link href="/admin">Inicio</Link>
          <Link href="/admin/products">Productos</Link>
          <Link href="/admin/categories">Categorías</Link>
          <Link href="/admin/settings">Ajustes</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
