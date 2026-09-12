"use client";

import { useState } from "react";

// Input de solo lectura + botón "Copiar": para que el dueño pueda pegar el
// link del menú público en sus redes sociales sin tener que armarlo a mano.
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si el navegador bloquea el clipboard, el link sigue seleccionable a
      // mano en el input de al lado.
    }
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full min-w-0 flex-1 rounded border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs text-neutral-600 outline-none focus:border-brand-navy"
      />
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded border border-neutral-300 px-2 py-1 text-xs"
      >
        {copied ? "Copiado ✓" : "Copiar"}
      </button>
    </div>
  );
}
