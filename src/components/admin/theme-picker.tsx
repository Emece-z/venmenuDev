"use client";

import { useState } from "react";
import { THEME_PRESETS, isLowContrast, type LocalTheme } from "@/lib/theme";

// Selector de paleta para el menú público: presets con un clic + colores
// individuales + vista previa en vivo. Los 3 valores viajan en el form como
// inputs ocultos (se actualizan con cada cambio, así "Guardar" los manda
// junto con el resto de Ajustes).
export function ThemePicker({ initialTheme }: { initialTheme: LocalTheme }) {
  const [theme, setTheme] = useState<LocalTheme>(initialTheme);

  const textLow = isLowContrast(theme.bg, theme.text);
  const accentLow = !textLow && isLowContrast(theme.bg, theme.accent);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {THEME_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setTheme(p.theme)}
            className="flex items-center gap-1.5 rounded border border-neutral-300 px-2 py-1 text-xs hover:border-neutral-400"
          >
            <Swatches theme={p.theme} />
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <ColorField
          label="Fondo"
          value={theme.bg}
          onChange={(v) => setTheme((t) => ({ ...t, bg: v }))}
        />
        <ColorField
          label="Texto"
          value={theme.text}
          onChange={(v) => setTheme((t) => ({ ...t, text: v }))}
        />
        <ColorField
          label="Acento (categorías, precios, botones)"
          value={theme.accent}
          onChange={(v) => setTheme((t) => ({ ...t, accent: v }))}
        />
      </div>

      {(textLow || accentLow) && (
        <p className="text-xs text-amber-700">
          ⚠ Con esta combinación el {textLow ? "texto" : "acento"} puede costar
          de leer sobre el fondo elegido. Podés dejarlo así si te gusta, o
          probar otra combinación.
        </p>
      )}

      <div
        className="overflow-hidden rounded-lg border border-neutral-300 p-3"
        style={{ background: theme.bg, color: theme.text }}
      >
        <p className="text-xs text-neutral-400" style={{ color: theme.text, opacity: 0.5 }}>
          Vista previa
        </p>
        <p className="mt-1 text-sm font-semibold">Mi Local</p>
        <p
          className="mt-2 text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.accent }}
        >
          Categoría de ejemplo
        </p>
        <div className="mt-1 flex justify-between text-sm">
          <span>Producto de ejemplo</span>
          <span className="font-semibold" style={{ color: theme.accent }}>
            $1.800
          </span>
        </div>
      </div>

      <input type="hidden" name="theme_bg" value={theme.bg} />
      <input type="hidden" name="theme_text" value={theme.text} />
      <input type="hidden" name="theme_accent" value={theme.accent} />
    </div>
  );
}

function Swatches({ theme }: { theme: LocalTheme }) {
  return (
    <span className="flex overflow-hidden rounded-full border border-neutral-300">
      <span className="h-4 w-4" style={{ background: theme.bg }} />
      <span className="h-4 w-4" style={{ background: theme.text }} />
      <span className="h-4 w-4" style={{ background: theme.accent }} />
    </span>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-500">
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-14 cursor-pointer rounded border border-neutral-300"
      />
    </label>
  );
}
