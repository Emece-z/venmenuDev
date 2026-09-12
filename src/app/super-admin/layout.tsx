import type { Metadata } from "next";
import Image from "next/image";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Super Admin" };

// Shell del panel de plataforma (vos). Solo rol super_admin.
export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src="/logo-icon.png" alt="" width={22} height={22} />
            <p className="text-sm font-semibold">
              <span className="text-brand-navy">Ven</span>
              <span className="text-brand-orange">Menu</span> · Plataforma
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-xs text-neutral-600 underline">Salir</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
