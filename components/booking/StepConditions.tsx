"use client";

import { useState, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";
import ReservationCalendar from "@/components/calendar/ReservationCalendar";
import {
  VehicleSelector,
  GuestCountSelector,
} from "@/components/booking/GuestSelector";
import OptionsSelector from "@/components/booking/OptionsSelector";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/booking/siteSettings";

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  const isExclusive = watch("isExclusive");

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  // 全枠空きかどうか（貸し切り可能か）
  const [exclusiveAvailable, setExclusiveAvailable] = useState(false);
  const [exclusiveSiteCount, setExclusiveSiteCount] = useState(5);
  const [checkingExclusive, setCheckingExclusive] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => {});
  }, []);

  // 日付が選択されたら全枠空きチェック
  const checkExclusiveAvailability = useCallback(async (checkin: Date, checkout: Date) => {
    setCheckingExclusive(true);
    setExclusiveAvailable(false);
    try {
      const from = toDateStr(checkin);
      // checkout日は滞在しないのでfromからcheckout前日まで
      const toPrev = new Date(checkout);
      toPrev.setDate(toPrev.getDate() - 1);
      const to = toDateStr(toPrev);

      const res = await fetch(`/api/availability?from=${from}&to=${to}`);
      if (!res.ok) return;
      const json = await res.json();
      const days: { date: string; max_sites: number; booked_sites: number; available_sites: number; is_closed: boolean }[] = json.availability ?? [];

      // 日程に対するレコードがない日はデフォルト（max_sites=5, booked=0, not closed）とみなす
      // → days が空でも全枠空き = 貸し切り可能
      const allFree = days.every((d) => !d.is_closed && d.booked_sites === 0);
      if (allFree) {
        const minSites = days.length > 0
          ? Math.min(...days.map((d) => d.max_sites))
          : 5; // デフォルト
        setExclusiveSiteCount(minSites);
        setExclusiveAvailable(true);
      }
    } catch {
      // ignore
    } finally {
      setCheckingExclusive(false);
    }
  }, []);

  useEffect(() => {
    if (checkinDate && checkoutDate && checkoutDate > checkinDate) {
      checkExclusiveAvailability(checkinDate, checkoutDate);
    } else {
      setExclusiveAvailable(false);
      // 日付が変わったら貸し切りモードをリセット
      if (isExclusive) {
        setValue("isExclusive", false);
        setValue("vehicleCount", 1);
        setValue("optionCounts", {});
      }
    }
  }, [checkinDate, checkoutDate, checkExclusiveAvailability, isExclusive, setValue]);

  function handleExclusiveToggle() {
    if (isExclusive) {
      // 貸し切りOFF: 通常モードに戻す
      setValue("isExclusive", false);
      setValue("vehicleCount", 1);
      setValue("optionCounts", {});
    } else {
      // 貸し切りON: 全区画確保
      setValue("isExclusive", true);
      setValue("vehicleCount", exclusiveSiteCount);
      setValue("optionCounts", {});
    }
  }

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

        {/* 貸し切りリクエストバナー（全枠空きの場合のみ表示） */}
        {checkinDate && checkoutDate && !checkingExclusive && exclusiveAvailable && (
          <div className={`mt-4 p-4 rounded-lg border-2 transition-all ${
            isExclusive
              ? "bg-purple-50 border-purple-400"
              : "bg-stone-50 border-stone-200"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-stone-800 flex items-center gap-2">
                  <span className="text-purple-600">★</span>
                  貸し切りリクエストが可能です
                </p>
                <p className="text-sm text-stone-600 mt-0.5">
                  この日程はすべての区画（{exclusiveSiteCount}区画）が空いています。
                  貸し切りでご利用いただけます。
                </p>
                {isExclusive && (
                  <p className="text-xs text-purple-700 mt-1 font-medium">
                    全{exclusiveSiteCount}区画を確保します。貸し切り専用オプションが選択できます。
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleExclusiveToggle}
                className="relative inline-flex items-center cursor-pointer ml-4 shrink-0"
              >
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${
                    isExclusive ? "bg-purple-600" : "bg-gray-200"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${
                      isExclusive ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Vehicle + guest count */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <SectionTitle number={2}>利用構成と人数</SectionTitle>
        {isExclusive && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
            貸し切りモード：全{exclusiveSiteCount}区画を確保しています。車両台数は変更できません。
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <VehicleSelector disabled={isExclusive} />
          <GuestCountSelector />
        </div>
      </section>

      {/* 3. Options */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <SectionTitle number={3}>追加オプション（レンタル品）</SectionTitle>
        {isExclusive && (
          <p className="mb-4 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg p-3">
            貸し切り専用のオプションを表示しています。
          </p>
        )}
        <OptionsSelector exclusive={isExclusive} />
      </section>
    </div>
  );
}
