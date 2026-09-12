import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Sin local" };

// Pantalla terminal para un usuario logueado que todavía no tiene un local
// asignado. Evita el bucle de redirecciones entre /admin y /super-admin.
export default async function SinLocalPage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role === "super_admin") redirect("/super-admin");
  if (profile.local_id) redirect("/admin");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-semibold">Cuenta sin local asignado</h1>
      <p className="text-sm text-neutral-600">
        Tu usuario todavía no está vinculado a ningún local. El administrador de
        la plataforma tiene que asignártelo.
      </p>
      <form action="/auth/signout" method="post">
        <button className="text-xs text-neutral-600 underline">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
