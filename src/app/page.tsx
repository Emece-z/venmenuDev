import Link from "next/link";

// Landing mínima del MVP. La cara comercial real vendrá después;
// por ahora solo enruta a las dos zonas privadas.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">VenMenu</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Menús digitales por NFC y QR para locales gastronómicos.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-center text-sm font-medium text-white"
        >
          Iniciar sesión
        </Link>
        <p className="text-xs text-neutral-500">
          ¿Eres cliente de un local? Acerca tu teléfono a la tarjeta NFC o escanea
          el QR de la mesa.
        </p>
      </div>
    </main>
  );
}
