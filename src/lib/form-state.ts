// Estado genérico para forms con `useActionState` (feedback inline: error u
// "OK ✓" en la misma pantalla, sin la pantalla roja de Next). Módulo plano
// (sin "use server") — un archivo "use server" solo puede exportar funciones
// async, así que esto no puede vivir en el propio actions.ts.

export type FormState = { ok: boolean; error: string | null };

export const initialFormState: FormState = { ok: false, error: null };
