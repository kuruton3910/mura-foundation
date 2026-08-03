"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";
import {
  calcTotal,
  calcBreakdown,
  calcNights,
  formatDate,
  toDateStr,
  type RentalOption,
  type SiteFees,
  type PersonFees,
  type PeakSeason,
  type ExclusiveFees,
  DEFAULT_SITE_FEES,
  DEFAULT_PERSON_FEES,
  DEFAULT_PEAK_SEASON,
  DEFAULT_EXCLUSIVE_FEES,
} from "@/lib/booking/pricing";
import { DEFAULT_SETTINGS } from "@/lib/booking/siteSettings";

type CouponInfo = {
  code: string;
  discountPercent: number;
  discountAmount: number;
  message: string;
};

type OrderSummaryProps = {
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting?: boolean;
};

const STEP_BUTTON_LABELS: Record<number, string> = {
  1: "利用規約の確認へ進む",
  2: "予約情報の入力へ進む",
  3: "決済へ進む",
  4: "予約を確定する",
};

export default function OrderSummary({
  currentStep,
  onNext,
  onPrev,
  isSubmitting,
}: OrderSummaryProps) {
  const { watch, setValue } = useFormContext<ReservationFormData>();
  const data = watch();
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  const isExclusive = data.isExclusive ?? false;
  const [options, setOptions] = useState<RentalOption[]>([]);
  const [siteFees, setSiteFees] = useState<SiteFees>(DEFAULT_SITE_FEES);
  const [personFees, setPersonFees] = useState<PersonFees>(DEFAULT_PERSON_FEES);
  const [peakSeason, setPeakSeason] = useState<PeakSeason>(DEFAULT_PEAK_SEASON);
  const [exclusiveFees, setExclusiveFees] = useState<ExclusiveFees>(DEFAULT_EXCLUSIVE_FEES);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setSiteFees({
          weekday: s.site_fee_weekday ?? DEFAULT_SETTINGS.site_fee_weekday,
          weekend: s.site_fee_weekend ?? DEFAULT_SETTINGS.site_fee_weekend,
        });
        setPersonFees({
          includedPersonsPerSite: s.included_persons_per_site ?? DEFAULT_SETTINGS.included_persons_per_site,
          extraPersonFeePerNight: s.extra_person_fee_per_night ?? DEFAULT_SETTINGS.extra_person_fee_per_night,
        });
        setPeakSeason({
          startMonth: s.peak_season_start_month ?? DEFAULT_SETTINGS.peak_season_start_month,
          startDay: s.peak_season_start_day ?? DEFAULT_SETTINGS.peak_season_start_day,
          endMonth: s.peak_season_end_month ?? DEFAULT_SETTINGS.peak_season_end_month,
          endDay: s.peak_season_end_day ?? DEFAULT_SETTINGS.peak_season_end_day,
        });
        setExclusiveFees({
          weekday: s.exclusive_fee_weekday ?? DEFAULT_SETTINGS.exclusive_fee_weekday,
          weekend: s.exclusive_fee_weekend ?? DEFAULT_SETTINGS.exclusive_fee_weekend,
          maxPersons: s.exclusive_max_persons ?? DEFAULT_SETTINGS.exclusive_max_persons,
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

  const baseTotal = calcTotal(data, options, siteFees, personFees, peakSeason, exclusiveFees);
  const breakdown = calcBreakdown(data, options, siteFees, personFees, peakSeason, exclusiveFees);

  // 貸し切り時の人数オーバー警告（フロント表示用、サーバー側でも検証）
  const totalPersons = (data.adults ?? 0) + (data.children ?? 0) + (data.pets ?? 0);
  const exclusiveOverLimit = isExclusive && totalPersons > exclusiveFees.maxPersons;

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponInfo, setCouponInfo] = useState<CouponInfo | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const discountAmount = couponInfo?.discountAmount ?? 0;
  const finalTotal = Math.max(0, baseTotal - discountAmount);

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponInfo(null);

    // チェックイン・チェックアウト日を送信して正確な平日/週末料金で割引額を計算
    const params = new URLSearchParams({
      code,
      isMember: String(data.isMember),
      vehicleCount: String(data.vehicleCount),
      nights: String(nights),
      ...(data.checkinDate ? { checkinDate: toDateStr(data.checkinDate) } : {}),
      ...(data.checkoutDate ? { checkoutDate: toDateStr(data.checkoutDate) } : {}),
    });

    // 通信エラー時も必ず「確認中...」を解除する（try/catch/finally）
    try {
      const res = await fetch(`/api/coupons/validate?${params}`);
      const json = await res.json().catch(() => null);

      if (!json) {
        setCouponError("クーポンの確認に失敗しました。もう一度お試しください。");
        setValue("couponCode", "");
        return;
      }

      if (json.valid) {
        setCouponInfo({
          code,
          discountPercent: json.discountPercent,
          discountAmount: json.discountAmount,
          message: json.message,
        });
        setValue("couponCode", code);
      } else {
        setCouponError(json.message ?? "このクーポンはご利用いただけません。");
        setValue("couponCode", "");
      }
    } catch {
      setCouponError("通信エラーが発生しました。もう一度お試しください。");
      setValue("couponCode", "");
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponInfo(null);
    setCouponInput("");
    setCouponError("");
    setValue("couponCode", "");
  }

  return (
    <div className="sticky top-8 space-y-4">
      <div className="bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden">
        <div className="bg-[#2D4030] text-white p-4 font-bold text-center">
          現在の予約内容
          {isExclusive && (
            <span className="ml-2 text-xs bg-purple-400 text-white px-2 py-0.5 rounded-full">
              貸し切り
            </span>
          )}
        </div>
        <div className="p-6 space-y-5">
          {/* Dates */}
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">チェックイン</dt>
              <dd className="font-bold text-right">
                {formatDate(data.checkinDate)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">チェックアウト</dt>
              <dd className="font-bold text-right">
                {formatDate(data.checkoutDate)}
              </dd>
            </div>
            {nights > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-500">泊数</dt>
                <dd className="font-bold">{nights}泊</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">車両・区画</dt>
              <dd className="font-bold">
                {data.vehicleCount}台 ({data.vehicleCount}区画)
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">人数</dt>
              <dd className="font-bold">
                大人 {data.adults}名
                {data.children > 0 && ` / 子ども ${data.children}名`}
                {data.pets > 0 && ` / ペット ${data.pets}匹`}
              </dd>
            </div>
          </dl>

          <hr />

          {/* Breakdown */}
          {breakdown.length > 0 ? (
            <div className="space-y-2 text-sm">
              {breakdown.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{item.label}</span>
                    <span>¥{item.amount.toLocaleString()}</span>
                  </div>
                  {item.detail && item.detail.length > 0 && (
                    <ul className="ml-3 pl-2 border-l-2 border-stone-200 text-[11px] text-gray-500 space-y-0.5">
                      {item.detail.map((d, j) => (
                        <li key={j}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {couponInfo && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>
                    クーポン ({couponInfo.code} -{couponInfo.discountPercent}%)
                  </span>
                  <span>-¥{couponInfo.discountAmount.toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center">
              日付を選択してください
            </p>
          )}

          {breakdown.length > 0 && <hr />}

          {/* Coupon input — shown from step 3 onward */}
          {currentStep >= 3 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-stone-600">
                クーポンコード
              </p>
              {couponInfo ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center justify-between">
                  <span className="font-medium">{couponInfo.message}</span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-stone-400 hover:text-stone-600 ml-2 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) =>
                        setCouponInput(e.target.value.toUpperCase())
                      }
                      placeholder="NAKAMA10"
                      className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-3 py-2 bg-[#2D4030] text-white text-xs font-medium rounded-lg hover:bg-[#2D4030]/90 transition-colors disabled:opacity-50"
                    >
                      {couponLoading ? "確認中..." : "適用"}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-600">{couponError}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Rules — 唯一の警告色として目立たせる（他は無彩色に寄せている）*/}
          <div className="rounded-lg border-2 border-red-600 overflow-hidden">
            <div className="bg-red-600 px-4 py-2 flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-white shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <h4 className="text-white text-sm font-bold tracking-wide">
                必ずお読みください
              </h4>
            </div>
            <ul className="bg-white px-4 py-3 text-xs text-stone-800 space-y-2">
              <li className="flex gap-2">
                <span className="text-red-600 font-bold shrink-0">・</span>
                <span>
                  利用時間：<strong className="text-red-700">11AM 〜 翌11AM</strong>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 font-bold shrink-0">・</span>
                <span>
                  <strong className="text-red-700">19:00〜翌5:00</strong>
                  は車の出入り禁止
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 font-bold shrink-0">・</span>
                <span>
                  子ども料金は<strong className="text-red-700">6〜17歳</strong>が対象
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 font-bold shrink-0">・</span>
                <span>
                  デイキャンプご希望の場合でも
                  <strong className="text-red-700">1泊でご予約</strong>ください
                </span>
              </li>
            </ul>
          </div>

          {/* Total */}
          <div className="text-center">
            <span className="text-sm text-gray-500">合計金額 (税込)</span>
            {couponInfo && baseTotal > 0 && (
              <div className="text-base text-stone-400 line-through">
                ¥{baseTotal.toLocaleString()}
              </div>
            )}
            <div className="text-3xl font-bold text-[#2D4030] mt-1">
              {finalTotal > 0 ? `¥${finalTotal.toLocaleString()}` : "---"}
            </div>
          </div>

          {/* 貸し切り人数オーバー警告 */}
          {exclusiveOverLimit && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900">
              <p className="font-bold mb-1">⚠ 貸し切りの最大人数を超えています</p>
              <p>
                貸し切りは合計{exclusiveFees.maxPersons}名（大人・子ども・ペット含む）までです。
                {exclusiveFees.maxPersons + 1}名以上の場合は追加料金が発生しますので、
                <strong>直接メールにてお問い合わせください。</strong>
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={onNext}
              disabled={isSubmitting || (currentStep === 4 && exclusiveOverLimit)}
              className="w-full bg-[#2D4030] hover:bg-[#2D4030]/80 text-white font-bold py-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "処理中..." : STEP_BUTTON_LABELS[currentStep]}
            </button>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={onPrev}
                className="w-full border border-stone-300 text-stone-600 font-medium py-3 rounded-lg hover:bg-stone-50 transition-colors"
              >
                ← 前のステップに戻る
              </button>
            )}
          </div>

          <p className="text-[10px] text-center text-gray-400">
            {currentStep === 1 &&
              "※次の画面で20項目の利用規約への同意が必要です。"}
            {currentStep === 2 && "※全項目への同意が必要です。"}
            {currentStep === 3 && "※入力内容を確認の上、決済へお進みください。"}
            {currentStep === 4 && "※決済が完了するまで予約は確定しません。"}
          </p>
        </div>
      </div>

      {/* <div className="text-center p-4 bg-stone-100 rounded-lg">
        <p className="text-xs text-stone-500">お困りの際はこちら</p>
        <a
          href="#"
          className="text-xs font-bold text-[#2D4030] underline mt-1 block"
        >
          よくある質問とヘルプ
        </a>
      </div> */}
    </div>
  );
}
