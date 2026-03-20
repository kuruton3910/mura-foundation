"use client";

import { useState } from "react";
import type { SiteSettings, TermGroup } from "@/lib/booking/siteSettings";

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

function PriceInput({
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
        <span className="text-sm text-stone-500">¥</span>
        <input
          type="number"
          min={0}
          step={100}
          value={values[fieldKey] as number}
          onChange={(e) => onChange(fieldKey, Number(e.target.value))}
          className="w-24 border border-stone-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#2D4030]"
        />
        <span className="text-sm text-stone-500">/ 区画・泊</span>
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

  function handleTermTitle(groupIndex: number, title: string) {
    setValues((prev) => {
      const groups = prev.terms_groups.map((g, i) =>
        i === groupIndex ? { ...g, title } : g,
      );
      return { ...prev, terms_groups: groups };
    });
    setMessage(null);
  }

  function handleTermItems(groupIndex: number, text: string) {
    const terms = text
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    setValues((prev) => {
      const groups = prev.terms_groups.map((g, i) =>
        i === groupIndex ? { ...g, terms } : g,
      );
      return { ...prev, terms_groups: groups };
    });
    setMessage(null);
  }

  function addGroup() {
    setValues((prev) => ({
      ...prev,
      terms_groups: [
        ...prev.terms_groups,
        { title: "新しいグループ", terms: ["規約項目を入力してください"] },
      ],
    }));
  }

  function removeGroup(groupIndex: number) {
    setValues((prev) => ({
      ...prev,
      terms_groups: prev.terms_groups.filter((_, i) => i !== groupIndex),
    }));
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
          <h2 className="font-bold text-stone-700 flex items-center gap-2">
            <span className="inline-block w-1 h-5 bg-[#2D4030] rounded-full" />
            シーズン設定
          </h2>
          <p className="text-sm text-stone-500 mt-0.5 ml-3">
            カレンダーに表示する営業シーズンの開始・終了日
          </p>
        </div>
        <div className="px-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
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
          <h2 className="font-bold text-stone-700 flex items-center gap-2">
            <span className="inline-block w-1 h-5 bg-[#2D4030] rounded-full" />
            予約受付期間
          </h2>
          <p className="text-sm text-stone-500 mt-0.5 ml-3">
            何日前から予約を受け付けるか
          </p>
        </div>
        <div className="px-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
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

      {/* 料金設定 */}
      <section className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="bg-stone-50 px-5 py-3 border-b border-stone-200">
          <h2 className="font-bold text-stone-700 flex items-center gap-2">
            <span className="inline-block w-1 h-5 bg-[#2D4030] rounded-full" />
            区画料金設定
          </h2>
          <p className="text-sm text-stone-500 mt-0.5 ml-3">
            平日（月〜木始まりの夜）と週末（金・土始まりの夜）の1区画あたりの料金
          </p>
        </div>
        <div className="px-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <PriceInput
            label="平日料金（月〜木）"
            fieldKey="site_fee_weekday"
            values={values}
            onChange={handleChange}
          />
          <PriceInput
            label="週末料金（金・土）"
            fieldKey="site_fee_weekend"
            values={values}
            onChange={handleChange}
          />
        </div>
      </section>

      {/* 人数料金設定 */}
      <section className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="bg-stone-50 px-5 py-3 border-b border-stone-200">
          <h2 className="font-bold text-stone-700 flex items-center gap-2">
            <span className="inline-block w-1 h-5 bg-[#2D4030] rounded-full" />
            人数料金設定
          </h2>
          <p className="text-sm text-stone-500 mt-0.5 ml-3">
            区画料に含まれる人数を超えた場合の追加料金。子ども・ペットは合算して2人で大人1名分。
          </p>
        </div>
        <div className="px-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div className="flex items-center gap-4 py-3 border-b border-stone-100">
            <span className="w-44 text-sm text-stone-600 shrink-0">区画料に含まれる人数</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={20}
                value={values.included_persons_per_site as number}
                onChange={(e) => handleChange("included_persons_per_site", Number(e.target.value))}
                className="w-16 border border-stone-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#2D4030]"
              />
              <span className="text-sm text-stone-500">名（大人換算）/ 区画</span>
            </div>
          </div>
          <div className="flex items-center gap-4 py-3">
            <span className="w-44 text-sm text-stone-600 shrink-0">追加1名あたりの料金</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-500">¥</span>
              <input
                type="number"
                min={0}
                step={100}
                value={values.extra_person_fee_per_night as number}
                onChange={(e) => handleChange("extra_person_fee_per_night", Number(e.target.value))}
                className="w-24 border border-stone-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#2D4030]"
              />
              <span className="text-sm text-stone-500">/ 泊</span>
            </div>
          </div>
        </div>
      </section>

      {/* 利用規約 */}
      <section className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="bg-stone-50 px-5 py-3 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-stone-700 flex items-center gap-2">
              <span className="inline-block w-1 h-5 bg-[#2D4030] rounded-full" />
              利用規約
            </h2>
            <p className="text-sm text-stone-500 mt-0.5 ml-3">
              グループ単位で編集できます。各項目は改行で区切ってください。
            </p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {values.terms_groups.map((group, i) => (
            <div key={i} className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="bg-stone-50 px-4 py-2 flex items-center gap-3 border-b border-stone-200">
                <span className="text-xs font-bold text-stone-500 w-16 shrink-0">グループ {i + 1}</span>
                <input
                  type="text"
                  value={group.title}
                  onChange={(e) => handleTermTitle(i, e.target.value)}
                  className="flex-1 border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#2D4030]"
                  placeholder="グループタイトル"
                />
                {/* グループ削除ボタン: 確認ダイアログ付き・目立つスタイル */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`「${group.title}」グループを削除しますか？この操作は保存前であれば元に戻せます。`)) {
                      removeGroup(i);
                    }
                  }}
                  className="text-xs text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50 hover:text-red-700 transition-colors shrink-0 border border-transparent hover:border-red-200"
                >
                  削除
                </button>
              </div>
              <div className="p-3">
                <textarea
                  rows={group.terms.length + 1}
                  value={group.terms.join("\n")}
                  onChange={(e) => handleTermItems(i, e.target.value)}
                  className="w-full border border-stone-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2D4030] font-mono leading-relaxed"
                  placeholder="1行ずつ規約項目を入力"
                />
                <p className="text-xs text-stone-400 mt-1">{group.terms.length}項目</p>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addGroup}
            className="text-sm text-[#2D4030] border border-[#2D4030] rounded-lg px-4 py-2 hover:bg-[#2D4030]/5 transition-colors"
          >
            + グループを追加
          </button>
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
