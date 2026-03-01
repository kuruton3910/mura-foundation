"use client";

import { useState } from "react";
import type { SiteSettings } from "@/lib/booking/siteSettings";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function MonthDayInput({
  label,
  monthKey,
  dayKey,
  values,
  onChange,
}: {
  label: string;
  monthKey: keyof SiteSettings;
  dayKey: keyof SiteSettings;
  values: SiteSettings;
  onChange: (key: keyof SiteSettings, val: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-stone-100 last:border-0">
      <span className="w-44 text-sm text-stone-600 shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <select
          value={values[monthKey] as number}
          onChange={(e) => onChange(monthKey, Number(e.target.value))}
          className="border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2D4030]"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}月
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={31}
          value={values[dayKey] as number}
          onChange={(e) => onChange(dayKey, Number(e.target.value))}
          className="w-16 border border-stone-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#2D4030]"
        />
        <span className="text-sm text-stone-500">日</span>
      </div>
    </div>
  );
}

function DaysInput({
  label,
  fieldKey,
  values,
  onChange,
}: {
  label: string;
  fieldKey: keyof SiteSettings;
  values: SiteSettings;
  onChange: (key: keyof SiteSettings, val: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-stone-100 last:border-0">
      <span className="w-44 text-sm text-stone-600 shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={365}
          value={values[fieldKey] as number}
          onChange={(e) => onChange(fieldKey, Number(e.target.value))}
          className="w-20 border border-stone-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#2D4030]"
        />
        <span className="text-sm text-stone-500">日前から受付</span>
      </div>
    </div>
  );
}

export default function SettingsEditor({
  settings: initialSettings,
}: {
  settings: SiteSettings;
}) {
  const [values, setValues] = useState<SiteSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleChange(key: keyof SiteSettings, val: number) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "設定を保存しました" });
    } else {
      setMessage({ type: "error", text: "保存に失敗しました" });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      {/* シーズン設定 */}
      <section className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="bg-stone-50 px-5 py-3 border-b border-stone-200">
          <h2 className="font-bold text-stone-700">シーズン設定</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            カレンダーに表示する営業シーズンの開始・終了日
          </p>
        </div>
        <div className="px-5">
          <MonthDayInput
            label="シーズン開始日"
            monthKey="season_open_month"
            dayKey="season_open_day"
            values={values}
            onChange={handleChange}
          />
          <MonthDayInput
            label="シーズン終了日（一般）"
            monthKey="season_close_month"
            dayKey="season_close_day"
            values={values}
            onChange={handleChange}
          />
          <MonthDayInput
            label="シーズン終了日（NAKAMA）"
            monthKey="member_close_month"
            dayKey="member_close_day"
            values={values}
            onChange={handleChange}
          />
        </div>
      </section>

      {/* 予約受付期間 */}
      <section className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="bg-stone-50 px-5 py-3 border-b border-stone-200">
          <h2 className="font-bold text-stone-700">予約受付期間</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            何日前から予約を受け付けるか
          </p>
        </div>
        <div className="px-5">
          <DaysInput
            label="一般ゲスト"
            fieldKey="booking_window_days"
            values={values}
            onChange={handleChange}
          />
          <DaysInput
            label="NAKAMA会員"
            fieldKey="booking_window_member_days"
            values={values}
            onChange={handleChange}
          />
        </div>
      </section>

      {/* 保存ボタン */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-[#2D4030] text-white font-medium rounded-lg hover:bg-[#2D4030]/80 transition-colors disabled:opacity-50"
        >
          {saving ? "保存中..." : "設定を保存する"}
        </button>
        {message && (
          <span
            className={`text-sm font-medium ${
              message.type === "success" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
