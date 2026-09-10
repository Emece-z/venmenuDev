"use client";

import { useState } from "react";
import { DAYS, type DayKey, type WeekHours } from "@/lib/hours";

// Editor del horario semanal. Una fila por día: checkbox "Cerrado" + rango
// horario. Al marcar "Cerrado" se deshabilitan (y no se envían) los `time`.
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
              disabled={isClosed}
              aria-label={`${d.label} abre`}
              className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-40"
            />
            <span className="text-neutral-400">a</span>
            <input
              type="time"
              name={`hours-${d.key}-close`}
              defaultValue={dv?.close ?? ""}
              disabled={isClosed}
              aria-label={`${d.label} cierra`}
              className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-40"
            />
          </div>
        );
      })}
    </div>
  );
}
