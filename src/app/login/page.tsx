import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

// Login único para dueños de local y super-admin. El rol decide a dónde
// se entra (lo resuelve la server action `signIn`).
export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(profile.role === "super_admin" ? "/super-admin" : "/admin");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Panel de administración de VenMenu.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
