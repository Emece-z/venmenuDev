// Conversión entre lo que el dueño escribe en el formulario y `price_cents`
// (entero en la unidad menor). Para CLP no hay decimales: 1 = 1 peso.

const ZERO_DECIMAL = new Set(["CLP", "JPY", "KRW", "PYG"]);

export function parsePriceToCents(input: string, currency = "CLP"): number {
  if (ZERO_DECIMAL.has(currency)) {
    const digits = input.replace(/\D/g, ""); // "1.800" / "$1800" -> "1800"
    if (!digits) throw new Error("Precio inválido");
    return parseInt(digits, 10);
  }
  const n = Number(input.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error("Precio inválido");
  return Math.round(n * 100);
}

// Valor para precargar el input al editar.
export function centsToInput(cents: number, currency = "CLP"): string {
  return ZERO_DECIMAL.has(currency) ? String(cents) : (cents / 100).toFixed(2);
}
