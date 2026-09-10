import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Helpers de sesión para usar dentro de Server Components / layouts / actions.
// El middleware ya bloquea el acceso por área; estas funciones dan además el
// objeto tipado y sirven de segunda barrera (defensa en profundidad).

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ?? null;
}

export async function requireOwner(): Promise<Profile & { local_id: string }> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "super_admin") redirect("/super-admin");
  // owner sin local asignado -> pantalla terminal (evita bucle con /super-admin).
  if (!profile.local_id) redirect("/sin-local");
  return profile as Profile & { local_id: string };
}

export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "super_admin") {
    redirect(profile.local_id ? "/admin" : "/sin-local");
  }
  return profile;
}
