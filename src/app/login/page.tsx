import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Login" };

// Login único para dueños de local y super-admin. El rol decide a dónde
// se entra (lo resuelve la server action `signIn`).
export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(profile.role === "super_admin" ? "/super-admin" : "/admin");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/logo-full.png"
          alt="VenMenu"
          width={900}
          height={940}
          priority
          className="h-auto w-28"
        />
        <h1 className="mt-3 text-xl font-semibold">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Panel de administración de VenMenu.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
