"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";
import {
  calcTotal,
  calcSiteFee,
  calcBreakdown,
  calcNights,
  formatDate,
  type RentalOption,
} from "@/lib/booking/pricing";

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

  useEffect(() => {
    fetch(`/api/options?exclusive=${isExclusive}`)
      .then((r) => r.json())
      .then((d) => setOptions(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [isExclusive]);

  const baseTotal = calcTotal(data, options);
  const breakdown = calcBreakdown(data, options);

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

    const params = new URLSearchParams({
      code,
      isMember: String(data.isMember),
      vehicleCount: String(data.vehicleCount),
      nights: String(nights),
    });

    const res = await fetch(`/api/coupons/validate?${params}`);
    const json = await res.json();

    if (json.valid) {
      setCouponInfo({
        code,
        discountPercent: json.discountPercent,
        discountAmount: json.discountAmount,
        message: json.message,
      });
      setValue("couponCode", code);
    } else {
      setCouponError(json.message);
      setValue("couponCode", "");
    }
    setCouponLoading(false);
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
                <div key={i} className="flex justify-between">
                  <span className="text-gray-600">{item.label}</span>
                  <span>¥{item.amount.toLocaleString()}</span>
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
                クーポンコード（NAKAMAメンバー）
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

          {/* Rules */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <h4 className="text-red-800 text-xs font-bold mb-2">重要ルール</h4>
            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
              <li>
                <strong>利用時間：11AM 〜 翌11AM</strong>
              </li>
              <li>
                <strong>20:00〜5:00は車の出入り禁止</strong>
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

          {/* Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={onNext}
              disabled={isSubmitting}
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
