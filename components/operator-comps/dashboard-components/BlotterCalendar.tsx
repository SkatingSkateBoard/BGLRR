"use client";

import * as React from "react";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react";
import { getBlotterCalendarAction } from "@/app/actions/blotter-actions";
import type { BlotterRow, BlotterStatus } from "@/app/actions/blotter-actions";

const MANILA_TZ = "Asia/Manila";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_CELL = 2;

type YearMonth = { year: number; month: number }; // month is 1-12
type CalendarStatus = Extract<BlotterStatus, "scheduled" | "completed">;

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MANILA_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MANILA_TZ,
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const statusStyle: Record<
  CalendarStatus,
  { chip: string; dot: string; pill: string; label: string }
> = {
  scheduled: {
    chip: "bg-blue-50 text-blue-800 hover:bg-blue-100",
    dot: "bg-blue-500",
    pill: "border-blue-200 bg-blue-50 text-blue-700",
    label: "Scheduled",
  },
  completed: {
    chip: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    dot: "bg-emerald-500",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "Completed",
  },
};

const pad = (n: number) => String(n).padStart(2, "0");
const dayKeyOf = (iso: string) => dayKeyFormatter.format(new Date(iso));

function currentManilaYearMonth(): YearMonth {
  const [year, month] = dayKeyFormatter.format(new Date()).split("-").map(Number);
  return { year, month };
}

function dayKey({ year, month }: YearMonth, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function daysInMonth({ year, month }: YearMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Weekday (0 = Sunday) of the 1st, computed in UTC so the viewer's timezone doesn't matter. */
function leadingBlanks({ year, month }: YearMonth): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const d = new Date(Date.UTC(ym.year, ym.month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** Start of a Manila calendar day, as an ISO string. */
function manilaMidnightISO(key: string): string {
  return new Date(`${key}T00:00:00+08:00`).toISOString();
}

function monthLabel({ year, month }: YearMonth): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function longDateLabel(key: string): string {
  return longDateFormatter.format(new Date(`${key}T12:00:00+08:00`));
}

function residentName(item: BlotterRow): string {
  return item.resident
    ? `${item.resident.first_name} ${item.resident.last_name}`
    : `Resident ID: ${item.resident_id}`;
}

function itemTime(item: BlotterRow): string {
  return item.appointment_date ? timeFormatter.format(new Date(item.appointment_date)) : "";
}

function statusOf(item: BlotterRow): CalendarStatus {
  return item.blotter_status === "completed" ? "completed" : "scheduled";
}

export function BlotterCalendar() {
  const [ym, setYm] = React.useState<YearMonth>(currentManilaYearMonth);
  const [items, setItems] = React.useState<BlotterRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const todayKey = React.useMemo(() => dayKeyFormatter.format(new Date()), []);

  React.useEffect(() => {
    let cancelled = false;
    const next = shiftMonth(ym, 1);

    setIsLoading(true);
    setError(null);

    getBlotterCalendarAction({
      from: manilaMidnightISO(dayKey(ym, 1)),
      to: manilaMidnightISO(dayKey(next, 1)),
    })
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setItems(res.data);
        } else {
          setItems([]);
          setError(res.error);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setError("Could not load the calendar.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ym, reloadKey]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, BlotterRow[]>();
    for (const item of items) {
      if (!item.appointment_date) continue;
      const key = dayKeyOf(item.appointment_date);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.appointment_date!).getTime() - new Date(b.appointment_date!).getTime()
      );
    }
    return map;
  }, [items]);

  /** Upcoming appointments in the visible month, used when no day is selected. */
  const upcoming = React.useMemo(() => {
    const now = Date.now();
    return items
      .filter((i) => i.appointment_date && new Date(i.appointment_date).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.appointment_date!).getTime() - new Date(b.appointment_date!).getTime()
      );
  }, [items]);

  const cells = React.useMemo(() => {
    const result: (string | null)[] = [];
    for (let i = 0; i < leadingBlanks(ym); i++) result.push(null);
    for (let d = 1; d <= daysInMonth(ym); d++) result.push(dayKey(ym, d));
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [ym]);

  const changeMonth = (delta: number) => {
    setSelectedDay(null);
    setYm((current) => shiftMonth(current, delta));
  };

  const goToToday = () => {
    setSelectedDay(null);
    setYm(currentManilaYearMonth());
  };

  const toggleDay = (key: string) =>
    setSelectedDay((current) => (current === key ? null : key));

  const selectedItems = selectedDay ? byDay.get(selectedDay) ?? [] : [];
  const agendaItems = selectedDay ? selectedItems : upcoming;
  const weekCount = cells.length / 7;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm lg:flex-row">
      {/* CALENDAR */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="h-4 w-px self-center bg-gray-200" />
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="h-8 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Today
            </button>
            <h3 className="text-base font-semibold text-gray-900" aria-live="polite">
              {monthLabel(ym)}
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
            {isLoading && <span className="animate-pulse text-gray-400">Loading…</span>}
            {(Object.keys(statusStyle) as CalendarStatus[]).map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${statusStyle[status].dot}`} />
                {statusStyle[status].label}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-5 py-2.5 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <RotateCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* WEEKDAYS — fixed height */}
        <div className="grid shrink-0 grid-cols-7 border-b border-gray-200/80">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* GRID — fills remaining height, rows split evenly */}
        <div
          aria-busy={isLoading}
          style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
          className={`grid min-h-0 flex-1 grid-cols-7 transition-opacity ${
            isLoading ? "opacity-60" : ""
          }`}
        >
          {cells.map((key, idx) => {
            const isLastRow = idx >= cells.length - 7;
            const borderClasses = `${idx % 7 !== 6 ? "border-r" : ""} ${
              !isLastRow ? "border-b" : ""
            } border-gray-100`;

            if (!key) {
              return (
                <div key={`blank-${idx}`} className={`min-h-[88px] bg-gray-50/60 ${borderClasses}`} />
              );
            }

            const dayNumber = Number(key.slice(-2));
            const dayItems = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            const overflow = dayItems.length - MAX_CHIPS_PER_CELL;

            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${longDateLabel(key)}, ${dayItems.length} appointment${
                  dayItems.length === 1 ? "" : "s"
                }`}
                onClick={() => toggleDay(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleDay(key);
                  }
                }}
                className={`group flex min-h-[88px] min-w-0 cursor-pointer flex-col gap-1 overflow-hidden p-2 transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(35,35,184)] ${borderClasses} ${
                  isSelected ? "bg-indigo-50/70" : "bg-white hover:bg-gray-50/70"
                }`}
              >
                <span
                  className={`inline-flex h-6 min-w-6 items-center justify-center self-start rounded-full px-1.5 text-xs font-semibold ${
                    isToday
                      ? "bg-[rgb(35,35,184)] text-white"
                      : isSelected
                      ? "text-[rgb(35,35,184)]"
                      : "text-gray-700"
                  }`}
                >
                  {dayNumber}
                </span>

                {dayItems.slice(0, MAX_CHIPS_PER_CELL).map((item) => {
                  const s = statusStyle[statusOf(item)];
                  return (
                    <span
                      key={item.id}
                      className={`flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs transition-colors ${s.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                      <span className="truncate">
                        <span className="font-semibold">{itemTime(item)}</span>
                        <span className="opacity-80"> {residentName(item)}</span>
                      </span>
                    </span>
                  );
                })}

                {overflow > 0 && (
                  <span className="px-1.5 text-xs font-medium text-[rgb(35,35,184)]">
                    +{overflow} more
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AGENDA PANEL */}
      <aside className="flex w-full shrink-0 flex-col border-t border-gray-200/80 bg-gray-50/40 lg:w-80 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between border-b border-gray-200/80 px-5 py-4">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-gray-900">
              {selectedDay ? longDateLabel(selectedDay) : "Upcoming"}
            </h4>
            <p className="text-xs text-gray-500">
              {selectedDay ? "Appointments for this day" : `Later in ${monthLabel(ym)}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
              {agendaItems.length}
            </span>
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-xs font-semibold text-[rgb(35,35,184)] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {agendaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-gray-200">
                <CalendarDays size={18} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                {selectedDay ? "Nothing scheduled" : "No upcoming appointments"}
              </p>
              <p className="text-xs text-gray-400">
                {selectedDay ? "Pick another day to see its appointments." : "Nothing left this month."}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {agendaItems.map((item) => {
                const status = statusOf(item);
                const s = statusStyle[status];
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-gray-200/80 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold tabular-nums text-gray-700">
                        {itemTime(item)}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.pill}`}
                      >
                        {status === "completed" ? (
                          <CheckCircle2 size={11} />
                        ) : (
                          <CalendarClock size={11} />
                        )}
                        {s.label}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-semibold text-gray-900">
                      {residentName(item)}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                      {item.description || "No details provided"}
                    </p>
                    {!selectedDay && item.appointment_date && (
                      <p className="mt-2 text-[11px] font-medium text-gray-400">
                        {longDateLabel(dayKeyOf(item.appointment_date))}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}