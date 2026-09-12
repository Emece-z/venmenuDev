"use client";

import { useState } from "react";
import { DAYS, type DayKey, type WeekHours } from "@/lib/hours";

// Editor del horario semanal. Una fila por día: checkbox "Cerrado" + rango
// horario. Al marcar "Cerrado" los `time` quedan de solo lectura (`readOnly`,
// NO `disabled`): un input disabled no se envía al guardar y borraría el
// horario ya cargado con solo tildar y destildar "Cerrado". Con `readOnly` el
// valor viaja igual; el server ignora los horarios cuando closed=true.
export function WeekHoursFields({
  defaultValue,
}: {
  defaultValue: WeekHours | null;
}) {
  const [closed, setClosed] = useState<Record<DayKey, boolean>>(
    () =>
      Object.fromEntries(
        DAYS.map((d) => [d.key, defaultValue?.[d.key]?.closed ?? false]),
      ) as Record<DayKey, boolean>,
  );

  return (
    <div className="flex flex-col gap-2">
      {DAYS.map((d) => {
        const dv = defaultValue?.[d.key];
        const isClosed = closed[d.key];
        return (
          <div key={d.key} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-24 shrink-0 text-neutral-600">{d.label}</span>
            <label className="flex items-center gap-1.5 text-xs text-neutral-500">
              <input
                type="checkbox"
                name={`hours-${d.key}-closed`}
                defaultChecked={isClosed}
                onChange={(e) =>
                  setClosed((s) => ({ ...s, [d.key]: e.target.checked }))
                }
              />
              Cerrado
            </label>
            <input
              type="time"
              name={`hours-${d.key}-open`}
              defaultValue={dv?.open ?? ""}
              readOnly={isClosed}
              aria-label={`${d.label} abre`}
              className={
                "rounded border border-neutral-300 px-2 py-1" +
                (isClosed ? " bg-neutral-50 text-neutral-400" : "")
              }
            />
            <span className="text-neutral-400">a</span>
            <input
              type="time"
              name={`hours-${d.key}-close`}
              defaultValue={dv?.close ?? ""}
              readOnly={isClosed}
              aria-label={`${d.label} cierra`}
              className={
                "rounded border border-neutral-300 px-2 py-1" +
                (isClosed ? " bg-neutral-50 text-neutral-400" : "")
              }
            />
          </div>
        );
      })}
    </div>
  );
}
