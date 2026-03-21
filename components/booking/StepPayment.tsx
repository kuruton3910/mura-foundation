"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";
import {
  calcTotal,
  calcBreakdown,
  calcNights,
  formatDate,
  type RentalOption,
  type SiteFees,
  type PersonFees,
  DEFAULT_SITE_FEES,
  DEFAULT_PERSON_FEES,
} from "@/lib/booking/pricing";
import { DEFAULT_SETTINGS } from "@/lib/booking/siteSettings";

export default function StepPayment() {
  const { watch } = useFormContext<ReservationFormData>();
  const data = watch();
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  const isExclusive = data.isExclusive ?? false;

  const [options, setOptions] = useState<RentalOption[]>([]);
  const [siteFees, setSiteFees] = useState<SiteFees>(DEFAULT_SITE_FEES);
  const [personFees, setPersonFees] = useState<PersonFees>(DEFAULT_PERSON_FEES);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setSiteFees({
          weekday: s.site_fee_weekday ?? DEFAULT_SETTINGS.site_fee_weekday,
          weekend: s.site_fee_weekend ?? DEFAULT_SETTINGS.site_fee_weekend,
        });
        setPersonFees({
          includedPersonsPerSite:
            s.included_persons_per_site ??
            DEFAULT_SETTINGS.included_persons_per_site,
          extraPersonFeePerNight:
            s.extra_person_fee_per_night ??
            DEFAULT_SETTINGS.extra_person_fee_per_night,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/options?exclusive=${isExclusive}`)
      .then((r) => r.json())
      .then((d) => setOptions(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [isExclusive]);

  const total = calcTotal(data, options, siteFees, personFees);
  const breakdown = calcBreakdown(data, options, siteFees, personFees);

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
        </div>
      </section>

      {/* お支払い案内 */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <h2 className="text-xl font-bold mb-6 flex items-center border-l-4 border-[#2D4030] pl-3">
          お支払いについて
        </h2>

        <div className="bg-stone-50 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#2D4030]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <svg
                className="w-5 h-5 text-[#2D4030]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <div>
              <p className="font-bold text-stone-700">
                「予約を確定する」ボタンを押すと、決済画面に移動します。
              </p>
              <p className="text-sm text-stone-500 mt-1">
                クレジットカード・デビットカードでお支払いいただけます。
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
