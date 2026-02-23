"use client";

import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";

export default function StepPersonalInfo({ error }: { error?: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ReservationFormData>();

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <h2 className="text-xl font-bold mb-6 flex items-center border-l-4 border-[#2D4030] pl-3">
          予約者情報の入力
        </h2>

        <p className="text-sm text-gray-500 mb-6">
          ご予約の確認メールをお送りするため、正確にご入力ください。
        </p>

        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold mb-2">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="山田 太郎"
              className={`w-full border-2 rounded-lg p-3 outline-none transition-colors ${
                errors.guestName
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-200 focus:border-[#2D4030]"
              }`}
              {...register("guestName")}
            />
            {errors.guestName && (
              <p className="mt-1 text-xs text-red-500">
                {errors.guestName.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold mb-2">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              className={`w-full border-2 rounded-lg p-3 outline-none transition-colors ${
                errors.guestEmail
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-200 focus:border-[#2D4030]"
              }`}
              {...register("guestEmail")}
            />
            {errors.guestEmail && (
              <p className="mt-1 text-xs text-red-500">
                {errors.guestEmail.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              予約確認メールをこちらに送信します。
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-bold mb-2">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="090-0000-0000"
              className={`w-full border-2 rounded-lg p-3 outline-none transition-colors ${
                errors.guestPhone
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-200 focus:border-[#2D4030]"
              }`}
              {...register("guestPhone")}
            />
            {errors.guestPhone && (
              <p className="mt-1 text-xs text-red-500">
                {errors.guestPhone.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold mb-2">
              ご要望・その他{" "}
              <span className="text-gray-400 font-normal">(任意)</span>
            </label>
            <textarea
              placeholder="アレルギーや特別なご要望があればお書きください。"
              rows={4}
              className="w-full border-2 border-gray-200 rounded-lg p-3 outline-none focus:border-[#2D4030] transition-colors resize-none"
              {...register("notes")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
