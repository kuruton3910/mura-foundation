"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Override = {
  id: string;
  date: string;
  available_sites: number | null;
  is_closed: boolean;
};

type Reservation = {
  checkin_date: string;
  checkout_date: string;
  vehicle_count: number;
};

const DEFAULT_SITES = 5;

function buildDateList(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from);
  const end = new Date(to);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getBookedCount(date: string, reservations: Reservation[]): number {
  return reservations
    .filter((r) => r.checkin_date <= date && r.checkout_date > date)
    .reduce((s, r) => s + r.vehicle_count, 0);
}

export default function AvailabilityEditor({
  overrides,
  reservations,
  fromDate,
  toDate,
}: {
  overrides: Override[];
  reservations: Reservation[];
  fromDate: string;
  toDate: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [overrideMap, setOverrideMap] = useState<Map<string, Override>>(
    () => new Map(overrides.map((o) => [o.date, o])),
  );

  const dates = buildDateList(fromDate, toDate);

  async function toggleClosed(date: string) {
    const existing = overrideMap.get(date);
    setSaving(date);

    if (existing?.is_closed) {
      // Remove the override
      await fetch(`/api/admin/availability`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const next = new Map(overrideMap);
      next.delete(date);
      setOverrideMap(next);
    } else {
      // Set as closed
      const res = await fetch(`/api/admin/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, is_closed: true, available_sites: null }),
      });
      const data = await res.json();
      if (data.override) {
        const next = new Map(overrideMap);
        next.set(date, data.override);
        setOverrideMap(next);
      }
    }
    setSaving(null);
    router.refresh();
  }

  async function updateSites(date: string, sites: number) {
    setSaving(date);
    const res = await fetch(`/api/admin/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, is_closed: false, available_sites: sites }),
    });
    const data = await res.json();
    if (data.override) {
      const next = new Map(overrideMap);
      next.set(date, data.override);
      setOverrideMap(next);
    }
    setSaving(null);
  }

  // Group dates by month
  const months: Record<string, string[]> = {};
  for (const d of dates) {
    const m = d.slice(0, 7);
    if (!months[m]) months[m] = [];
    months[m].push(d);
  }

  return (
    <div className="space-y-8">
      {Object.entries(months).map(([month, monthDates]) => (
        <div
          key={month}
          className="bg-white rounded-xl border border-stone-200 overflow-hidden"
        >
          <div className="bg-stone-50 px-5 py-3 border-b border-stone-200">
            <h2 className="font-bold text-stone-700">
              {new Date(month + "-01").toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
              })}
            </h2>
          </div>
          <div className="divide-y divide-stone-100">
            {monthDates.map((date) => {
              const ov = overrideMap.get(date);
              const booked = getBookedCount(date, reservations);
              const maxSites = ov?.available_sites ?? DEFAULT_SITES;
              const isClosed = ov?.is_closed ?? false;
              const available = isClosed ? 0 : maxSites - booked;
              const isSaving = saving === date;

              const dayOfWeek = new Date(date).toLocaleDateString("ja-JP", {
                weekday: "short",
              });

              return (
                <div
                  key={date}
                  className={`flex items-center gap-4 px-5 py-3 text-sm ${
                    isClosed ? "bg-red-50" : ""
                  }`}
                >
                  <span className="w-24 font-medium text-stone-700">
                    {date.slice(5)} ({dayOfWeek})
                  </span>

                  <span
                    className={`w-20 text-center text-xs font-medium px-2 py-1 rounded-full ${
                      isClosed
                        ? "bg-red-100 text-red-700"
                        : available <= 0
                          ? "bg-stone-100 text-stone-500"
                          : available <= 2
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isClosed ? "休業" : `残${available}区画`}
                  </span>

                  <span className="text-stone-400 text-xs">
                    予約済: {booked}区画
                  </span>

                  {!isClosed && (
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="text-xs text-stone-500">
                        最大区画数:
                      </label>
                      <select
                        value={maxSites}
                        onChange={(e) =>
                          updateSites(date, Number(e.target.value))
                        }
                        disabled={isSaving}
                        className="border border-stone-200 rounded px-1.5 py-0.5 text-xs text-stone-700 focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => toggleClosed(date)}
                    disabled={isSaving}
                    className={`ml-auto px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                      isClosed
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {isSaving ? "..." : isClosed ? "休業解除" : "休業にする"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
