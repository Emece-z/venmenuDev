// Paleta de color del menú público. Módulo plano (sin "use server") para
// usarlo en actions, componentes cliente y en /m/[slug].

export type LocalTheme = {
  bg: string; // fondo
  text: string; // texto principal
  accent: string; // categorías, precios, botones
};

// Si el local no eligió nada, se ve exactamente como antes de esta feature.
export const DEFAULT_THEME: LocalTheme = {
  bg: "#ffffff",
  text: "#171717",
  accent: "#171717",
};

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(v: string): boolean {
  return HEX_RE.test(v);
}

// Paletas curadas: pensadas para que alguien sin experiencia en diseño elija
// una con un clic y ya se vea prolijo. "Clásico" es el ejemplo tipo
// McDonald's (fondo blanco, letras negras, acento amarillo) que pidió el dueño.
export const THEME_PRESETS: { key: string; label: string; theme: LocalTheme }[] = [
  {
    key: "blanco_negro",
    label: "Blanco y negro",
    theme: { ...DEFAULT_THEME },
  },
  {
    key: "clasico",
    label: "Clásico amarillo",
    theme: { bg: "#ffffff", text: "#171717", accent: "#F2B705" },
  },
  {
    key: "bistro",
    label: "Bistró cálido",
    theme: { bg: "#FFFBF5", text: "#3A2E28", accent: "#C1622D" },
  },
  {
    key: "cafeteria",
    label: "Cafetería",
    theme: { bg: "#FFFFFF", text: "#2B2118", accent: "#6F4E37" },
  },
  {
    key: "pizzeria",
    label: "Pizzería",
    theme: { bg: "#FFF9F0", text: "#2B2B2B", accent: "#C0392B" },
  },
  {
    key: "verde",
    label: "Verde fresco",
    theme: { bg: "#FFFFFF", text: "#1F2B1F", accent: "#2E7D32" },
  },
  {
    key: "nocturno",
    label: "Nocturno elegante",
    theme: { bg: "#1A1A1A", text: "#F2F2F2", accent: "#D4AF37" },
  },
];

// Contraste WCAG (relative luminance) — para avisar si texto/fondo van a
// costar de leer. No bloquea el guardado, solo avisa.
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA para texto normal es 4.5. Usamos 3 como piso más permisivo (esto es
// un aviso, no una validación dura).
export function isLowContrast(hexA: string, hexB: string): boolean {
  return contrastRatio(hexA, hexB) < 3;
}
