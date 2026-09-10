// Estado del form de Ajustes para `useActionState`. En módulo aparte porque
// `actions.ts` es "use server" y ahí solo se pueden exportar funciones async.

export type SettingsState = { ok: boolean; error: string | null };

export const initialSettingsState: SettingsState = { ok: false, error: null };
