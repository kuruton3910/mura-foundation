"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";
import ReservationCalendar from "@/components/calendar/ReservationCalendar";
import {
  VehicleSelector,
  GuestCountSelector,
} from "@/components/booking/GuestSelector";
import OptionsSelector from "@/components/booking/OptionsSelector";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/booking/siteSettings";

function SectionTitle({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <h2 className="text-xl font-bold mb-6 flex items-center border-l-4 border-[#2D4030] pl-3">
      {number}. {children}
    </h2>
  );
}

export default function StepConditions({ error }: { error?: string }) {
  const { watch, setValue } = useFormContext<ReservationFormData>();
  const isMember = watch("isMember");
  const checkinDate = watch("checkinDate");
  const checkoutDate = watch("checkoutDate");

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* Step validation error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 1. Date selection */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <SectionTitle number={1}>日付の選択</SectionTitle>

        {/* NAKAMA toggle */}
        <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
          <div>
            <span className="font-bold text-amber-900">
              NAKAMA (賛助会員) ですか？
            </span>
            <p className="text-sm text-amber-800">
              会員は{settings.booking_window_member_days}日前から予約可能、一般は{settings.booking_window_days}日前から
            </p>
          </div>
          <button
            type="button"
            onClick={() => setValue("isMember", !isMember)}
            className="relative inline-flex items-center cursor-pointer"
          >
            <div
              className={`w-11 h-6 rounded-full transition-colors ${
                isMember ? "bg-[#2D4030]" : "bg-gray-200"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${
                  isMember ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Season info */}
        <div className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <span className="font-medium">シーズン：</span>
            {settings.season_open_month}月{settings.season_open_day}日オープン〜{settings.season_close_month}月{settings.season_close_day}日クローズ
          </span>
          <span>
            <span className="font-medium text-amber-700">NAKAMA会員：</span>
            {settings.member_close_month}月{settings.member_close_day}日まで予約可能
          </span>
        </div>

        {/* Calendar */}
        <ReservationCalendar />

        {/* Selected date display */}
        {(checkinDate || checkoutDate) && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
            <div className="flex gap-4 flex-wrap">
              {checkinDate && (
                <span>
                  <span className="text-gray-500">IN: </span>
                  <span className="font-bold">
                    {checkinDate.getFullYear()}年{checkinDate.getMonth() + 1}月
                    {checkinDate.getDate()}日
                  </span>
                </span>
              )}
              {checkoutDate && (
                <span>
                  <span className="text-gray-500">OUT: </span>
                  <span className="font-bold">
                    {checkoutDate.getFullYear()}年{checkoutDate.getMonth() + 1}
                    月{checkoutDate.getDate()}日
                  </span>
                </span>
              )}
              {!checkoutDate && checkinDate && (
                <span className="text-amber-600">
                  ← チェックアウト日を選択してください
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 2. Vehicle + guest count */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <SectionTitle number={2}>利用構成と人数</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <VehicleSelector />
          <GuestCountSelector />
        </div>
      </section>

      {/* 3. Options */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <SectionTitle number={3}>追加オプション（レンタル品）</SectionTitle>
        <OptionsSelector />
      </section>
    </div>
  );
}
