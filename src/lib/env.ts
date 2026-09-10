// Acceso centralizado y validado a variables de entorno.
// La validación es "perezosa": falla al USAR el valor, no al importar el
// módulo, para no romper `next build` en entornos sin las variables cargadas.

function required(name: string, value: string | undefined): string {
  if (!value || value === "REEMPLAZAR") {
    throw new Error(
      `Falta la variable de entorno ${name}. Copiá .env.example a .env.local y completá los valores.`,
    );
  }
  return value;
}

export const env = {
  get SUPABASE_URL() {
    return required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get SUPABASE_ANON_KEY() {
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  get SITE_URL() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};

// Solo servidor. No importar desde componentes cliente.
export function serviceRoleKey(): string {
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
