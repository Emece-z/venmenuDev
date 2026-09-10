export default function MenuNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-2 px-6 text-center">
      <h1 className="text-lg font-semibold">Menú no disponible</h1>
      <p className="text-sm text-neutral-600">
        Este menú no existe o el local está temporalmente inactivo.
      </p>
    </main>
  );
}
