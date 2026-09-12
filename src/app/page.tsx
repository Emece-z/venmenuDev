import Image from "next/image";
import Link from "next/link";

// Landing mínima del MVP. La cara comercial real vendrá después;
// por ahora solo enruta a las dos zonas privadas.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Image
        src="/logo-full.png"
        alt="VenMenu"
        width={900}
        height={940}
        priority
        className="h-auto w-40"
      />

      <div>
        <p className="text-sm text-neutral-600">
          Menús digitales por NFC y QR para locales gastronómicos.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-brand-navy px-4 py-2 text-center text-sm font-medium text-white"
        >
          Iniciar sesión
        </Link>
        <p className="text-xs text-neutral-500">
          ¿Eres cliente de un local? Acerca tu teléfono a la tarjeta{" "}
          <span className="font-medium text-brand-orange">NFC</span> o
          escanea el QR de la mesa.
        </p>
      </div>
    </main>
  );
}
