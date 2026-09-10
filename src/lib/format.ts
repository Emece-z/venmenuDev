// El precio se guarda como entero en la unidad menor de la moneda
// (price_cents). Para CLP no hay decimales, así que 1 "cent" = 1 peso.
// Esta función centraliza el formateo para toda la app.

export function formatPrice(priceCents: number, currency = "CLP"): string {
  const zeroDecimalCurrencies = new Set(["CLP", "JPY", "KRW", "PYG"]);
  const divisor = zeroDecimalCurrencies.has(currency) ? 1 : 100;

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: divisor === 1 ? 0 : 2,
  }).format(priceCents / divisor);
}
