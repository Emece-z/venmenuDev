// Horario de atención del local. Se guarda en `locals.hours` (jsonb).
// Módulo plano (sin "use server") para usarlo en actions, componentes cliente
// y en la página pública.

export const DAYS = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
] as const;

export type DayKey = (typeof DAYS)[number]["key"];

// `open`/`close` en formato "HH:MM" (o "" si no está seteado).
export type DayHours = { closed: boolean; open: string; close: string };
export type WeekHours = Record<DayKey, DayHours>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function emptyDay(): DayHours {
  return { closed: false, open: "", close: "" };
}

export function emptyWeek(): WeekHours {
  return Object.fromEntries(DAYS.map((d) => [d.key, emptyDay()])) as WeekHours;
}

function coerceTime(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return HHMM.test(s) ? s : "";
}

// Normaliza lo que venga de la DB (jsonb ya parseado, o string) a un WeekHours
// completo. Devuelve null si no hay nada aprovechable. `open`/`close` se
// conservan aunque `closed` sea true (closed es solo la bandera que se muestra
// al público; el horario no se pierde al destildar "Cerrado" más adelante).
export function parseWeekHours(raw: unknown): WeekHours | null {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;

  const src = obj as Record<string, unknown>;
  const week = emptyWeek();
  for (const d of DAYS) {
    const day = src[d.key];
    if (day && typeof day === "object") {
      const dd = day as Record<string, unknown>;
      week[d.key] = {
        closed: dd.closed === true,
        open: coerceTime(dd.open),
        close: coerceTime(dd.close),
      };
    }
  }
  return hasMeaningfulHours(week) ? week : null;
}

// Lee los campos `hours-<dia>-closed|open|close` de un FormData. Los horarios
// se guardan igual estén "Cerrado" o no: los inputs de horario son `readOnly`
// (no `disabled`) en el form, así que siempre viajan y nunca se pierden por
// tildar/destildar el checkbox.
export function readWeekHoursFromForm(formData: FormData): WeekHours {
  const week = emptyWeek();
  for (const d of DAYS) {
    week[d.key] = {
      closed: formData.get(`hours-${d.key}-closed`) === "on",
      open: coerceTime(formData.get(`hours-${d.key}-open`)),
      close: coerceTime(formData.get(`hours-${d.key}-close`)),
    };
  }
  return week;
}

// ¿Vale la pena guardar/mostrar esto? (algún día cerrado explícito o con rango)
export function hasMeaningfulHours(week: WeekHours | null): boolean {
  if (!week) return false;
  return DAYS.some((d) => {
    const h = week[d.key];
    return h.closed || (h.open !== "" && h.close !== "");
  });
}

// Texto para la página pública.
export function dayHoursLabel(h: DayHours): string {
  if (h.closed) return "Cerrado";
  if (h.open && h.close) return `${h.open} – ${h.close}`;
  return "—";
}
