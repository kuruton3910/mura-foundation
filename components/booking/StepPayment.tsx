"use client";

import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";
import {
  calcTotal,
  calcBreakdown,
  calcNights,
  formatDate,
} from "@/lib/booking/pricing";

export default function StepPayment() {
  const { watch } = useFormContext<ReservationFormData>();
  const data = watch();
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  const total = calcTotal(data);
  const breakdown = calcBreakdown(data);

  return (
    <div className="space-y-6">
      {/* Booking summary for confirmation */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <h2 className="text-xl font-bold mb-6 flex items-center border-l-4 border-[#2D4030] pl-3">
          予約内容の最終確認
        </h2>

        <div className="space-y-4 text-sm mb-6">
          <div className="grid grid-cols-2 gap-2 bg-stone-50 p-4 rounded-lg">
            <span className="text-gray-500">お名前</span>
            <span className="font-bold">{data.guestName || "—"}</span>
            <span className="text-gray-500">メール</span>
            <span className="font-bold break-all">
              {data.guestEmail || "—"}
            </span>
            <span className="text-gray-500">電話番号</span>
            <span className="font-bold">{data.guestPhone || "—"}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-stone-50 p-4 rounded-lg">
            <span className="text-gray-500">チェックイン</span>
            <span className="font-bold">{formatDate(data.checkinDate)}</span>
            <span className="text-gray-500">チェックアウト</span>
            <span className="font-bold">{formatDate(data.checkoutDate)}</span>
            <span className="text-gray-500">泊数</span>
            <span className="font-bold">{nights}泊</span>
            <span className="text-gray-500">車両・区画</span>
            <span className="font-bold">
              {data.vehicleCount}台 ({data.vehicleCount}区画)
            </span>
            <span className="text-gray-500">人数</span>
            <span className="font-bold">
              大人 {data.adults}名
              {data.children > 0 ? ` / 子ども ${data.children}名` : ""}
              {data.pets > 0 ? ` / ペット ${data.pets}匹` : ""}
            </span>
          </div>

          {breakdown.length > 0 && (
            <div className="bg-stone-50 p-4 rounded-lg space-y-2">
              {breakdown.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-600">{item.label}</span>
                  <span>¥{item.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>合計 (税込)</span>
                <span className="text-[#2D4030]">
                  ¥{total.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Payment placeholder */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <h2 className="text-xl font-bold mb-6 flex items-center border-l-4 border-[#2D4030] pl-3">
          お支払い
        </h2>

        <div className="flex flex-col items-center justify-center py-12 bg-stone-50 rounded-xl border-2 border-dashed border-stone-300 text-center">
          <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <p className="font-bold text-stone-600 mb-1">
            Stripe 決済 (実装予定)
          </p>
          <p className="text-sm text-stone-400 max-w-xs">
            Phase 2でStripe
            Checkoutを統合します。クレジットカード・デビットカードに対応予定です。
          </p>
        </div>
      </section>
    </div>
  );
}
