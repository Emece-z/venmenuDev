// Planes de suscripción y estados. Placeholder hasta definir precios reales.
// Módulo plano (sin "use server") para poder importarlo tanto en Server Actions
// como en componentes cliente.

import type { SubscriptionStatus } from "@/lib/types";

export const PLANS = ["basico", "estandar", "premium"] as const;
export type Plan = (typeof PLANS)[number];

const PLAN_LABELS: Record<string, string> = {
  basico: "Básico",
  estandar: "Estándar",
  premium: "Premium",
  basic: "Básico", // legacy: filas viejas creadas con el default 'basic'
};

export function planLabel(plan: string): string {
  return PLAN_LABELS[plan] ?? plan;
}

export function normalizePlan(raw: unknown): Plan {
  const v = String(raw ?? "").trim();
  return (PLANS as readonly string[]).includes(v) ? (v as Plan) : "basico";
}

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
];

const SUB_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "En prueba",
  active: "Activa",
  past_due: "Pago vencido",
  canceled: "Cancelada",
};

export function subStatusLabel(status: string): string {
  return SUB_STATUS_LABELS[status as SubscriptionStatus] ?? status;
}
