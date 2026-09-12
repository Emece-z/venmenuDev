"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/categories", label: "Categorías" },
  { href: "/admin/settings", label: "Ajustes" },
];

// Resalta la pestaña de la pantalla en la que estás (negrita + subrayado).
// La forma más simple que se nota: usePathname() acá, en un componente
// cliente aparte, porque el layout (AdminLayout) es un Server Component y no
// puede usar hooks.
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-3xl gap-4 px-4 pb-2 text-sm">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? "font-semibold text-neutral-900 underline"
                : "text-neutral-500"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
