"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Reservation = {
  id: string;
  guest_name: string;
  checkin_date: string;
  checkout_date: string;
  vehicle_count: number;
  adults: number;
  children: number;
  total_amount: number;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-amber-400",
  cancelled: "bg-red-400",
  refunded: "bg-stone-400",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "確定",
  pending: "未決済",
  cancelled: "キャンセル",
  refunded: "返金済",
};

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

export default function ReservationCalendar({
  reservations,
}: {
  reservations: Reservation[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 月の最初の日と最後の日
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 月曜始まりの曜日オフセット（0=月 ... 6=日）
  const startOffset = (firstDay.getDay() + 6) % 7;

  // 日付ごとの予約マップを作成（チェックイン〜チェックアウト前日まで）
  const dateMap = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const start = new Date(r.checkin_date);
      const end = new Date(r.checkout_date);
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      }
    }
    return map;
  }, [reservations]);

  // 選択日の予約
  const selectedReservations = selectedDate ? (dateMap.get(selectedDate) ?? []) : [];

  function prevMonth() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(today.toISOString().split("T")[0]);
  }

  const todayStr = today.toISOString().split("T")[0];

  // カレンダーのセルを生成
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  // 残りを埋めて7の倍数にする
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* ナビゲーション */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-stone-800 min-w-[140px] text-center">
            {year}年 {month + 1}月
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-sm rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
        >
          今日
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-stone-200">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 text-center text-xs font-medium ${
                i === 5 ? "text-blue-500" : i === 6 ? "text-red-500" : "text-stone-500"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-[80px] bg-stone-50/50 border-b border-r border-stone-100" />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayReservations = dateMap.get(dateStr) ?? [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayOfWeek = (startOffset + day - 1) % 7; // 0=月 ... 6=日

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`min-h-[80px] p-1.5 border-b border-r border-stone-100 text-left transition-colors hover:bg-stone-50 ${
                  isSelected ? "bg-[#2D4030]/5 ring-2 ring-inset ring-[#2D4030]" : ""
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                    isToday
                      ? "bg-[#2D4030] text-white font-bold"
                      : dayOfWeek === 5
                        ? "text-blue-500"
                        : dayOfWeek === 6
                          ? "text-red-500"
                          : "text-stone-700"
                  }`}
                >
                  {day}
                </span>
                {/* 予約バー */}
                <div className="mt-1 space-y-0.5">
                  {dayReservations.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className={`${STATUS_COLORS[r.status] ?? "bg-stone-300"} text-white text-[10px] leading-tight px-1 py-0.5 rounded truncate`}
                    >
                      {r.guest_name}
                    </div>
                  ))}
                  {dayReservations.length > 3 && (
                    <div className="text-[10px] text-stone-400 pl-1">
                      +{dayReservations.length - 3}件
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 mt-3 text-xs text-stone-500">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[key]}`} />
            {label}
          </div>
        ))}
      </div>

      {/* 選択日の予約詳細 */}
      {selectedDate && (
        <div className="mt-4 bg-white rounded-xl border border-stone-200 p-4">
          <h3 className="font-bold text-stone-800 mb-3">
            {selectedDate} の予約（{selectedReservations.length}件）
          </h3>
          {selectedReservations.length > 0 ? (
            <div className="space-y-2">
              {selectedReservations.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/reservations/${r.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-stone-100 hover:bg-stone-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${STATUS_COLORS[r.status] ?? "bg-stone-300"}`}
                      />
                      <span className="font-medium text-stone-800">
                        {r.guest_name}
                      </span>
                      <span className="text-xs text-stone-400">
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1 ml-4">
                      {r.checkin_date} → {r.checkout_date}　/　{r.vehicle_count}区画・大人{r.adults}名
                      {r.children > 0 ? `・子${r.children}名` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-stone-800">
                      ¥{r.total_amount?.toLocaleString()}
                    </span>
                    <span className="text-xs text-stone-400 ml-1">→</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-stone-400 text-sm">この日の予約はありません。</p>
          )}
        </div>
      )}
    </div>
  );
}
