"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Override = {
  id: string;
  date: string;
  max_sites: number | null;
  is_closed: boolean;
  icon: string | null;
};

type Reservation = {
  checkin_date: string;
  checkout_date: string;
  vehicle_count: number;
};

const DEFAULT_SITES = 5;
const ICONS = [
  { value: "🌕", label: "満月" },
  { value: "🌑", label: "新月" },
  { value: "⭐", label: "星" },
];

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

  // 一括設定の状態
  const [bulkFrom, setBulkFrom] = useState("");
  const [bulkTo, setBulkTo] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const dates = buildDateList(fromDate, toDate);

  async function handleBulkClose() {
    if (!bulkFrom || !bulkTo || bulkFrom > bulkTo) {
      setBulkMessage({ type: "error", text: "日付範囲を正しく入力してください" });
      return;
    }
    setBulkSaving(true);
    setBulkMessage(null);
    const res = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: bulkFrom, to: bulkTo, is_closed: true }),
    });
    const data = await res.json();
    if (res.ok) {
      setBulkMessage({ type: "success", text: `${data.count}日間を休業に設定しました` });
      router.refresh();
    } else {
      setBulkMessage({ type: "error", text: "設定に失敗しました" });
    }
    setBulkSaving(false);
  }

  async function handleBulkOpen() {
    if (!bulkFrom || !bulkTo || bulkFrom > bulkTo) {
      setBulkMessage({ type: "error", text: "日付範囲を正しく入力してください" });
      return;
    }
    setBulkSaving(true);
    setBulkMessage(null);
    const res = await fetch("/api/admin/availability", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: bulkFrom, to: bulkTo }),
    });
    const data = await res.json();
    if (res.ok) {
      setBulkMessage({ type: "success", text: `${data.count}日間の休業設定を解除しました` });
      router.refresh();
    } else {
      setBulkMessage({ type: "error", text: "解除に失敗しました" });
    }
    setBulkSaving(false);
  }

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
    const existing = overrideMap.get(date);
    const res = await fetch(`/api/admin/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, is_closed: false, available_sites: sites, icon: existing?.icon ?? null }),
    });
    const data = await res.json();
    if (data.override) {
      const next = new Map(overrideMap);
      next.set(date, data.override);
      setOverrideMap(next);
    }
    setSaving(null);
  }

  async function updateIcon(date: string, icon: string | null) {
    setSaving(date);
    const existing = overrideMap.get(date);
    const res = await fetch(`/api/admin/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        is_closed: existing?.is_closed ?? false,
        available_sites: existing?.max_sites ?? null,
        icon,
      }),
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
    <div className="space-y-6">
      {/* 一括設定パネル */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h2 className="font-bold text-amber-900 mb-1">シーズン一括設定</h2>
        <p className="text-xs text-amber-700 mb-4">
          クローズシーズン（例：11月〜3月）をまとめて休業設定できます
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500">開始日</label>
            <input
              type="date"
              value={bulkFrom}
              onChange={(e) => setBulkFrom(e.target.value)}
              className="border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
          <span className="text-stone-400 pb-1">〜</span>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500">終了日</label>
            <input
              type="date"
              value={bulkTo}
              onChange={(e) => setBulkTo(e.target.value)}
              className="border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
          <button
            onClick={handleBulkClose}
            disabled={bulkSaving}
            className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {bulkSaving ? "処理中..." : "一括休業にする"}
          </button>
          <button
            onClick={handleBulkOpen}
            disabled={bulkSaving}
            className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {bulkSaving ? "処理中..." : "一括解除する"}
          </button>
        </div>
        {bulkMessage && (
          <p
            className={`mt-3 text-sm font-medium ${
              bulkMessage.type === "success" ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {bulkMessage.text}
          </p>
        )}
      </div>

      {/* 日別設定 */}
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
              const maxSites = ov?.max_sites ?? DEFAULT_SITES;
              const isClosed = ov?.is_closed ?? false;
              const available = isClosed ? 0 : maxSites - booked;
              const isSaving = saving === date;
              const currentIcon = ov?.icon ?? null;

              const dayOfWeek = new Date(date).toLocaleDateString("ja-JP", {
                weekday: "short",
              });

              return (
                <div
                  key={date}
                  className={`flex flex-wrap items-center gap-3 px-5 py-3 text-sm ${
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

                  {/* アイコン選択 */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-stone-400 mr-1">アイコン:</span>
                    {ICONS.map((ic) => (
                      <button
                        key={ic.value}
                        type="button"
                        onClick={() =>
                          updateIcon(date, currentIcon === ic.value ? null : ic.value)
                        }
                        disabled={isSaving}
                        title={ic.label}
                        className={`w-7 h-7 text-base flex items-center justify-center rounded transition-colors disabled:opacity-40 ${
                          currentIcon === ic.value
                            ? "bg-stone-200 ring-1 ring-stone-400"
                            : "hover:bg-stone-100"
                        }`}
                      >
                        {ic.value}
                      </button>
                    ))}
                  </div>

                  {!isClosed && (
                    <div className="flex items-center gap-2">
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
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
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
