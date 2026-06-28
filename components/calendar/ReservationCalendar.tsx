"use client";

import { useState, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";
import type { DailyAvailability } from "@/lib/supabase/types";
import {
  DEFAULT_SETTINGS,
  type SiteSettings,
} from "@/lib/booking/siteSettings";
import { isWeekendNight, type PeakSeason } from "@/lib/booking/pricing";

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const LOW_SPOTS_THRESHOLD = 3;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DateStatus =
  | "available"
  | "full"
  | "exclusive" // 既に貸し切り予約が入っている日
  | "past"
  | "too_far" // 予約受付前（まだ早すぎる）
  | "pre_season" // シーズン前
  | "post_season" // シーズン後（一般客またはNAKAMAも期間外）
  | "closed"; // 管理者設定で休業

function getDateStatus(
  date: Date,
  today: Date,
  maxBookableDate: Date,
  isMember: boolean,
  spots: number | null,
  isExclusiveBooked: boolean,
  s: SiteSettings,
): DateStatus {
  if (date < today) return "past";

  const y = date.getFullYear();
  const seasonOpen = new Date(y, s.season_open_month - 1, s.season_open_day);
  const seasonClose = new Date(y, s.season_close_month - 1, s.season_close_day);
  const memberClose = new Date(y, s.member_close_month - 1, s.member_close_day);

  if (date < seasonOpen) return "pre_season";

  // 一般客はシーズン終了後に予約不可
  if (!isMember && date > seasonClose) return "post_season";

  // NAKAMA会員もメンバー期間終了後は予約不可
  if (isMember && date > memberClose) return "post_season";

  // 予約受付期間外
  if (date > maxBookableDate) return "too_far";

  // 管理者クローズまたは満室
  if (spots === null) return "closed";
  if (isExclusiveBooked) return "exclusive";
  if (spots === 0) return "full";

  return "available";
}

export default function ReservationCalendar() {
  const { setValue, watch } = useFormContext<ReservationFormData>();
  const checkinDate = watch("checkinDate");
  const checkoutDate = watch("checkoutDate");
  const isMember = watch("isMember");

  const today = startOfDay(new Date());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [availability, setAvailability] = useState<
    Map<string, DailyAvailability>
  >(new Map());
  const [exclusiveDates, setExclusiveDates] = useState<Set<string>>(new Set());
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const peakSeason: PeakSeason = {
    startMonth: settings.peak_season_start_month,
    startDay: settings.peak_season_start_day,
    endMonth: settings.peak_season_end_month,
    endDay: settings.peak_season_end_day,
  };

  // 設定を取得（初回のみ）
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => {}); // フォールバック: DEFAULT_SETTINGS のまま
  }, []);

  const maxDaysAhead = isMember
    ? settings.booking_window_member_days
    : settings.booking_window_days;
  const maxBookableDate = new Date(today);
  maxBookableDate.setDate(maxBookableDate.getDate() + maxDaysAhead);

  const fetchAvailability = useCallback(async (year: number, month: number) => {
    setLoadingAvail(true);
    try {
      const from = toDateStr(new Date(year, month, 1));
      const to = toDateStr(new Date(year, month + 1, 0));
      const res = await fetch(`/api/availability?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      const map = new Map<string, DailyAvailability>();
      for (const item of json.availability ?? []) {
        map.set(item.date, item);
      }
      setAvailability(map);
      setExclusiveDates(new Set<string>(json.exclusiveDates ?? []));
    } catch {
      setAvailability(new Map());
      setExclusiveDates(new Set());
    } finally {
      setLoadingAvail(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchAvailability]);

  function getAvailableSpots(date: Date): number | null {
    const avail = availability.get(toDateStr(date));
    if (!avail) return 5;
    if (avail.is_closed) return null;
    return avail.available_sites;
  }

  function getDateIcon(date: Date): string | null {
    return availability.get(toDateStr(date))?.icon ?? null;
  }

  const canGoPrev = !(
    viewYear === today.getFullYear() && viewMonth <= today.getMonth()
  );

  // カレンダー移動の上限
  // 通常: 予約受付期間の最終日まで
  // チェックイン選択済み: シーズン終了月の翌月末まで（チェックアウト日選択のため）
  const navigationLimit = (() => {
    if (!checkinDate) return maxBookableDate;
    const closeMonth = isMember
      ? settings.member_close_month
      : settings.season_close_month;
    // closeMonth は 1-indexed → JS Date は 0-indexed。翌月末は new Date(year, closeMonth + 1, 0)
    return new Date(checkinDate.getFullYear(), closeMonth + 1, 0);
  })();

  // 翌月の1日目が移動可能上限以内か
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= navigationLimit;

  function prevMonth() {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }

  // 宿泊夜（チェックイン〜チェックアウト前日）の中に予約不可日がないか検証
  // 「予約受付期間外（too_far）」は宿泊夜としては許可
  // （チェックイン日が受付期間内なら、その後の宿泊夜も予約OK＝サーバーと同じ挙動）
  function isStayRangeAvailable(checkin: Date, checkout: Date): boolean {
    const cur = new Date(checkin.getFullYear(), checkin.getMonth(), checkin.getDate());
    while (cur < checkout) {
      const dStr = toDateStr(cur);
      const dSpots = getAvailableSpots(cur);
      const dExclusive = exclusiveDates.has(dStr);
      const dStatus = getDateStatus(
        cur,
        today,
        maxBookableDate,
        isMember,
        dSpots,
        dExclusive,
        settings,
      );
      // available または too_far(受付期間外だが営業中) は許可
      // それ以外（休業・貸切・満室・シーズン外・過去）はNG
      if (dStatus !== "available" && dStatus !== "too_far") return false;
      cur.setDate(cur.getDate() + 1);
    }
    return true;
  }

  function handleDateClick(date: Date) {
    const spots = getAvailableSpots(date);
    const isExclusiveBooked = exclusiveDates.has(toDateStr(date));
    const status = getDateStatus(
      date,
      today,
      maxBookableDate,
      isMember,
      spots,
      isExclusiveBooked,
      settings,
    );

    // チェックアウトを選ぶ局面か判定
    // (チェックイン済み・チェックアウト未選択・クリック日がチェックインより後)
    const isSelectingCheckout =
      checkinDate !== null && checkoutDate === null && date > checkinDate;

    if (isSelectingCheckout) {
      // チェックアウト日自体は宿泊しないので、満室・貸切・休業・予約受付期間外でも選べる
      // ただし過去日・シーズン前は不可
      if (status === "past" || status === "pre_season") {
        return;
      }
      // 最大連泊数チェック
      const proposedNights = Math.round(
        (date.getTime() - checkinDate!.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (proposedNights > settings.max_stay_nights) {
        setRangeError(
          `連続宿泊は最大${settings.max_stay_nights}泊までです。${settings.max_stay_nights + 1}泊以上をご希望の場合は直接メールでお問い合わせください。`,
        );
        return;
      }
      // 途中の宿泊夜に予約不可日があれば選択不可
      if (!isStayRangeAvailable(checkinDate!, date)) {
        setRangeError(
          "選択範囲に予約不可（貸切・休業・満室・シーズン外）の日が含まれています。",
        );
        return;
      }
      setRangeError(null);
      setValue("checkoutDate", date);
      return;
    }

    // チェックインまたは選択リセット時：availableの日のみ選択可能
    if (status !== "available") return;
    setRangeError(null);

    if (!checkinDate || (checkinDate && checkoutDate)) {
      setValue("checkinDate", date);
      setValue("checkoutDate", null);
    } else {
      // チェックイン済みで同日以前をクリック → チェックインを再設定
      if (date <= checkinDate) {
        setValue("checkinDate", date);
        setValue("checkoutDate", null);
      } else {
        setValue("checkoutDate", date);
      }
    }
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDow = firstDay.getDay();

  const prevMonthLast = new Date(viewYear, viewMonth, 0);
  const paddingDays: Date[] = [];
  for (let i = startDow - 1; i >= 0; i--) {
    paddingDays.push(
      new Date(viewYear, viewMonth - 1, prevMonthLast.getDate() - i),
    );
  }

  const currentDays: Date[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentDays.push(new Date(viewYear, viewMonth, d));
  }

  const allCells = [...paddingDays, ...currentDays];
  const remaining = (7 - (allCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    allCells.push(new Date(viewYear, viewMonth + 1, d));
  }

  function getCellStyle(date: Date, isCurrentMonth: boolean) {
    if (!isCurrentMonth) {
      return {
        cell: "bg-white p-2 h-20 flex flex-col items-center opacity-20",
        text: "",
        price: "",
        priceCls: "",
        badge: "",
        badgeCls: "",
      };
    }
    const d = startOfDay(date);
    const spots = getAvailableSpots(d);
    const isExclusiveBooked = exclusiveDates.has(toDateStr(d));
    const status = getDateStatus(
      d,
      today,
      maxBookableDate,
      isMember,
      spots,
      isExclusiveBooked,
      settings,
    );

    const isCheckin = checkinDate && isSameDay(d, checkinDate);
    const isCheckout = checkoutDate && isSameDay(d, checkoutDate);
    const isInRange =
      checkinDate && checkoutDate && d > checkinDate && d < checkoutDate;

    // チェックアウト日として選択可能か：
    //   1. チェックイン済み・チェックアウト未選択・未来日
    //   2. 最大連泊数以内
    //   3. 途中の宿泊夜に予約不可日（貸切・休業・満室）が含まれない
    const canBeCheckout = (() => {
      if (checkinDate === null || checkoutDate !== null) return false;
      if (d <= checkinDate) return false;
      const proposedNights = Math.round(
        (d.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (proposedNights > settings.max_stay_nights) return false;
      if (!isStayRangeAvailable(checkinDate, d)) return false;
      return true;
    })();

    const isWeekend = isWeekendNight(d, peakSeason);
    const nightFee = isWeekend
      ? settings.site_fee_weekend
      : settings.site_fee_weekday;
    const priceLabel = `¥${nightFee.toLocaleString()}`;

    if (isCheckin)
      return {
        cell: "bg-[#2D4030] p-2 h-20 flex flex-col items-center cursor-pointer rounded-l-lg",
        text: "text-white font-bold",
        price: priceLabel,
        priceCls: "text-[9px] leading-none text-emerald-300 mt-0.5",
        badge: "IN",
        badgeCls: "text-[10px] mt-1 text-emerald-200",
      };
    if (isCheckout)
      return {
        cell: "bg-[#2D4030] p-2 h-20 flex flex-col items-center cursor-pointer rounded-r-lg",
        text: "text-white font-bold",
        price: "",
        priceCls: "",
        badge: "OUT",
        badgeCls: "text-[10px] mt-1 text-emerald-200",
      };
    if (isInRange) {
      const badgeColor = (spots ?? 0) <= LOW_SPOTS_THRESHOLD ? "text-red-500" : "text-[#2D4030]";
      return {
        cell: "bg-emerald-100 p-2 h-20 flex flex-col items-center cursor-pointer",
        text: "text-[#2D4030]",
        price: priceLabel,
        priceCls: `text-[9px] leading-none mt-0.5 ${isWeekend ? "text-rose-600" : "text-stone-500"}`,
        badge: `残${spots}`,
        badgeCls: `text-[10px] mt-0.5 ${badgeColor}`,
      };
    }

    switch (status) {
      case "available": {
        const badgeColor = (spots ?? 0) <= LOW_SPOTS_THRESHOLD ? "text-red-500 font-bold" : "text-[#2D4030]";
        return {
          cell: `${isWeekend ? "bg-rose-50 hover:bg-rose-100" : "bg-white hover:bg-green-50"} p-2 h-20 flex flex-col items-center cursor-pointer border-2 border-transparent hover:border-[#2D4030] transition-all`,
          text: isWeekend ? "text-rose-700" : "",
          price: priceLabel,
          priceCls: `text-[9px] leading-none mt-0.5 font-medium ${isWeekend ? "text-rose-500" : "text-stone-400"}`,
          badge: `残${spots}`,
          badgeCls: `text-[10px] mt-0.5 ${badgeColor}`,
        };
      }
      case "full":
        if (canBeCheckout) {
          return {
            cell: "bg-white p-2 h-20 flex flex-col items-center cursor-pointer border-2 border-dashed border-stone-300 hover:border-[#2D4030] hover:bg-stone-50 transition-all",
            text: "text-stone-500",
            price: "",
            priceCls: "",
            badge: "OUT可",
            badgeCls: "text-[10px] mt-1 text-emerald-600 font-medium",
          };
        }
        return {
          cell: "bg-white p-2 h-20 flex flex-col items-center opacity-40 cursor-not-allowed",
          text: "text-gray-400",
          price: "",
          priceCls: "",
          badge: "×",
          badgeCls: "text-[10px] mt-1 text-red-400",
        };
      case "exclusive":
        if (canBeCheckout) {
          return {
            cell: "bg-purple-50 p-2 h-20 flex flex-col items-center cursor-pointer border-2 border-dashed border-purple-300 hover:border-purple-600 transition-all",
            text: "text-purple-700",
            price: "",
            priceCls: "",
            badge: "OUT可",
            badgeCls: "text-[10px] mt-1 text-emerald-600 font-medium",
          };
        }
        return {
          cell: "bg-purple-50 p-2 h-20 flex flex-col items-center cursor-not-allowed border border-purple-200",
          text: "text-purple-700",
          price: "",
          priceCls: "",
          badge: "貸切",
          badgeCls: "text-[10px] mt-1 text-purple-700 font-bold",
        };
      case "past":
        return {
          cell: "bg-white p-2 h-20 flex flex-col items-center opacity-25 cursor-not-allowed",
          text: "text-gray-400",
          price: "",
          priceCls: "",
          badge: "",
          badgeCls: "",
        };
      case "too_far":
        if (canBeCheckout) {
          return {
            cell: `${isWeekend ? "bg-rose-50 hover:bg-rose-100" : "bg-white hover:bg-stone-50"} p-2 h-20 flex flex-col items-center cursor-pointer border-2 border-dashed border-stone-300 hover:border-[#2D4030] transition-all`,
            text: isWeekend ? "text-rose-700" : "text-stone-600",
            price: priceLabel,
            priceCls: `text-[9px] leading-none mt-0.5 font-medium ${isWeekend ? "text-rose-500" : "text-stone-400"}`,
            badge: "OUT可",
            badgeCls: "text-[10px] mt-0.5 text-emerald-600 font-medium",
          };
        }
        return {
          cell: "bg-stone-50 p-2 h-20 flex flex-col items-center opacity-40 cursor-not-allowed",
          text: "text-stone-400",
          price: "",
          priceCls: "",
          badge: "受付前",
          badgeCls: "text-[9px] mt-1 text-stone-400",
        };
      case "pre_season":
        return {
          cell: "bg-blue-50 p-2 h-20 flex flex-col items-center opacity-40 cursor-not-allowed",
          text: "text-blue-300",
          price: "",
          priceCls: "",
          badge: "準備中",
          badgeCls: "text-[9px] mt-1 text-blue-400",
        };
      case "post_season":
        return {
          cell: "bg-amber-50 p-2 h-20 flex flex-col items-center opacity-50 cursor-not-allowed",
          text: "text-amber-600",
          price: "",
          priceCls: "",
          badge: "NAKAMA",
          badgeCls: "text-[9px] mt-1 text-amber-500",
        };
      case "closed":
        if (canBeCheckout) {
          return {
            cell: "bg-red-50 p-2 h-20 flex flex-col items-center cursor-pointer border-2 border-dashed border-red-200 hover:border-red-400 transition-all",
            text: "text-red-400",
            price: "",
            priceCls: "",
            badge: "OUT可",
            badgeCls: "text-[10px] mt-1 text-emerald-600 font-medium",
          };
        }
        return {
          cell: "bg-red-50 p-2 h-20 flex flex-col items-center opacity-40 cursor-not-allowed",
          text: "text-red-300",
          price: "",
          priceCls: "",
          badge: "休業",
          badgeCls: "text-[9px] mt-1 text-red-400",
        };
      default:
        return {
          cell: "bg-white p-2 h-20 flex flex-col items-center opacity-30 cursor-not-allowed",
          text: "text-gray-400",
          price: "",
          priceCls: "",
          badge: "",
          badgeCls: "",
        };
    }
  }

  const monthNames = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];

  // シーズン後・NAKAMA限定月を表示中かどうか
  const isNakamaBanner =
    !isMember &&
    (viewMonth + 1 > settings.season_close_month ||
      (viewMonth + 1 === settings.season_close_month &&
        /* 月全体が対象 */ false)) &&
    viewMonth + 1 <= settings.member_close_month;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* NAKAMA限定バナー */}
      {isNakamaBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800">
          {settings.season_close_month}月以降の予約は
          <strong>NAKAMAメンバー限定</strong>です。
          上の「NAKAMAメンバー」をオンにするとご予約いただけます。
        </div>
      )}

      {/* 予約受付期間バナー */}
      <div className="bg-stone-50 border-b border-stone-200 px-4 py-2 text-xs text-stone-600 flex items-center gap-2">
        <span className="font-medium">予約受付期間：</span>
        {isMember ? (
          <span className="text-[#2D4030] font-bold">
            本日から{settings.booking_window_member_days}
            日先まで（NAKAMAメンバー）
          </span>
        ) : (
          <span>
            本日から{settings.booking_window_days}日先まで（一般のお客様）
          </span>
        )}
      </div>

      {/* 範囲選択エラー（連続予約不可など） */}
      {rangeError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 flex items-start gap-2">
          <span>⚠</span>
          <span>{rangeError}</span>
        </div>
      )}

      <div className="bg-stone-100 p-4 flex justify-between items-center border-b">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className={`w-12 h-12 text-2xl flex items-center justify-center rounded-full font-bold hover:bg-stone-200 transition-colors
         ${canGoPrev ? "hover:bg-stone-200" : "opacity-20 cursor-not-allowed"}`}
        >
          ‹
        </button>
        <span className="font-bold text-lg flex items-center gap-2">
          {viewYear}年 {monthNames[viewMonth]}
          {loadingAvail && (
            <span className="w-4 h-4 border-2 border-[#2D4030] border-t-transparent rounded-full animate-spin inline-block" />
          )}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          disabled={!canGoNext}
          className={`w-12 h-12 text-2xl flex items-center justify-center rounded-full font-bold transition-colors
          ${canGoNext ? "hover:bg-stone-200" : "opacity-20 cursor-not-allowed"}`}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center bg-stone-50 text-xs py-2 border-b">
        {DOW_LABELS.map((d, i) => (
          <div
            key={d}
            className={
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""
            }
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {allCells.map((date, idx) => {
          const isCurrentMonth = date.getMonth() === viewMonth;
          const style = getCellStyle(date, isCurrentMonth);
          const icon = isCurrentMonth ? getDateIcon(startOfDay(date)) : null;
          return (
            <div
              key={idx}
              className={style.cell}
              onClick={() =>
                isCurrentMonth && handleDateClick(startOfDay(date))
              }
            >
              <span
                className={`text-sm ${style.text} ${date.getDay() === 0 && isCurrentMonth ? "text-red-500" : ""} ${date.getDay() === 6 && isCurrentMonth ? "text-blue-500" : ""}`}
              >
                {date.getDate()}
              </span>
              {style.price && (
                <span className={style.priceCls}>{style.price}</span>
              )}
              {style.badge && (
                <span className={style.badgeCls}>{style.badge}</span>
              )}
              {icon && (
                <span className="text-[11px] mt-0.5 leading-none">{icon}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-stone-50 border-t flex flex-wrap gap-3 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#2D4030] rounded inline-block" /> 選択中
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-emerald-100 border border-[#2D4030] rounded inline-block" />{" "}
          範囲内
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-white border border-gray-300 rounded inline-block" />{" "}
          平日 <span className="text-stone-500">¥{settings.site_fee_weekday.toLocaleString()}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-rose-50 border border-rose-200 rounded inline-block" />{" "}
          週末・祝日・ピーク <span className="text-rose-500 font-medium">¥{settings.site_fee_weekend.toLocaleString()}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-amber-50 border border-amber-200 rounded inline-block" />{" "}
          NAKAMA限定
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-purple-50 border border-purple-200 rounded inline-block" />{" "}
          貸切予約済
        </span>
        <span className="flex items-center gap-1 opacity-40">
          <span className="w-3 h-3 bg-gray-200 rounded inline-block" /> 予約不可
        </span>
      </div>

      {/* アイコン凡例 */}
      <div className="px-3 pb-3 pt-1 bg-stone-50 border-t border-stone-100 flex flex-wrap gap-3 text-xs text-stone-500">
        <span className="text-stone-400">アイコン:</span>
        <span className="flex items-center gap-1">🌕 満月</span>
        <span className="flex items-center gap-1">🌑 新月</span>
        <span className="flex items-center gap-1">🌠 流星群</span>
      </div>
    </div>
  );
}
