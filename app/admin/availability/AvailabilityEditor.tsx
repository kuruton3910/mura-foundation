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
    <div className="space-y-6 overflow-x-auto">
      {/* 一括設定パネル */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 bg-amber-500 rounded-full" />
          <h2 className="font-bold text-amber-900 text-base">シーズン一括設定</h2>
        </div>
        <p className="text-sm text-amber-700 mb-4 ml-3">
          クローズシーズン（例：11月〜3月）をまとめて休業設定できます
        </p>
        {/* 日付入力とボタンを縦に分割してモバイルでも見やすく */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-600">開始日</label>
              <input
                type="date"
                value={bulkFrom}
                onChange={(e) => setBulkFrom(e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <span className="text-stone-400 pb-2 font-medium">〜</span>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-600">終了日</label>
              <input
                type="date"
                value={bulkTo}
                onChange={(e) => setBulkTo(e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleBulkClose}
              disabled={bulkSaving}
              className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {bulkSaving ? "処理中..." : "一括休業にする"}
            </button>
            <button
              onClick={handleBulkOpen}
              disabled={bulkSaving}
              className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {bulkSaving ? "処理中..." : "一括解除する"}
            </button>
          </div>
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
          className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm"
        >
          {/* 月ヘッダーを目立たせる */}
          <div className="bg-[#2D4030] px-5 py-3">
            <h2 className="font-bold text-white text-base">
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
                  className={`px-5 py-3 text-sm ${
                    isClosed ? "bg-red-50" : ""
                  }`}
                >
                  {/* 1行目: 日付・ステータス・予約数 */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="w-24 font-medium text-stone-700 shrink-0">
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
                  </div>

                  {/* 2行目: 操作パネル（アイコン・区画数・休業ボタン） */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap sm:ml-0 ml-0">
                    {/* アイコン選択 */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-stone-500 mr-0.5">アイコン:</span>
                      {ICONS.map((ic) => (
                        <button
                          key={ic.value}
                          type="button"
                          onClick={() =>
                            updateIcon(date, currentIcon === ic.value ? null : ic.value)
                          }
                          disabled={isSaving}
                          title={ic.label}
                          className={`w-8 h-8 text-base flex items-center justify-center rounded-lg transition-all disabled:opacity-40 ${
                            currentIcon === ic.value
                              ? "bg-[#2D4030]/10 ring-2 ring-[#2D4030] shadow-sm"
                              : "hover:bg-stone-100 ring-1 ring-stone-200"
                          }`}
                        >
                          {ic.value}
                        </button>
                      ))}
                    </div>

                    {/* 区画数セレクト（休業でないとき） */}
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
                          className="border border-stone-200 rounded px-1.5 py-0.5 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#2D4030]"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 休業トグルボタン */}
                    <button
                      onClick={() => toggleClosed(date)}
                      disabled={isSaving}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ml-auto ${
                        isClosed
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {isSaving ? "..." : isClosed ? "休業解除" : "休業にする"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
