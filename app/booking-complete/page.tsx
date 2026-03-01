"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Reservation } from "@/lib/supabase/types";
import { formatDate } from "@/lib/booking/pricing";

// useSearchParams() は Suspense でラップが必要なため内部コンポーネントに分離
function BookingCompleteContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("セッションIDが見つかりません");
      setLoading(false);
      return;
    }

    async function fetchReservation() {
      const supabase = createClient();
      // Webhook が処理されるまで少し待つ
      await new Promise((r) => setTimeout(r, 1500));

      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .single();

      if (error || !data) {
        setError("予約情報の取得に失敗しました");
      } else {
        setReservation(data as Reservation);
      }
      setLoading(false);
    }

    fetchReservation();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2D4030] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600">予約情報を確認しています...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-800 mb-2">
            エラーが発生しました
          </h1>
          <p className="text-stone-500 text-sm mb-6">
            {error || "予約情報が見つかりませんでした"}
          </p>
          <a
            href="/"
            className="inline-block bg-[#2D4030] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#2D4030]/80 transition-colors"
          >
            予約ページに戻る
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12 max-w-2xl">
      {/* Success banner */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-10 h-10 text-[#2D4030]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#2D4030] mb-2">
          ご予約が確定しました！
        </h2>
        <p className="text-stone-500">
          確認メールを <strong>{reservation.guest_email}</strong>{" "}
          に送信しました。
        </p>
      </div>

      {/* Reservation details */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden mb-6">
        <div className="bg-[#2D4030] text-white p-4 font-bold text-center">
          予約番号: {reservation.id.slice(0, 8).toUpperCase()}
        </div>
        <div className="p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <span className="text-gray-500">お名前</span>
            <span className="font-bold">{reservation.guest_name}</span>

            <span className="text-gray-500">チェックイン</span>
            <span className="font-bold">
              {formatDate(new Date(reservation.checkin_date))} 11:00〜
            </span>

            <span className="text-gray-500">チェックアウト</span>
            <span className="font-bold">
              {formatDate(new Date(reservation.checkout_date))} 〜11:00
            </span>

            <span className="text-gray-500">区画数</span>
            <span className="font-bold">{reservation.vehicle_count}区画</span>

            <span className="text-gray-500">人数</span>
            <span className="font-bold">
              大人 {reservation.adults}名
              {reservation.children > 0
                ? ` / 子ども ${reservation.children}名`
                : ""}
              {reservation.pets > 0 ? ` / ペット ${reservation.pets}匹` : ""}
            </span>

            <span className="text-gray-500">お支払い金額</span>
            <span className="font-bold text-[#2D4030] text-base">
              ¥{reservation.total_amount.toLocaleString()}（税込）
            </span>
          </div>
        </div>
      </div>

      {/* Important rules reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
        <h3 className="font-bold text-amber-900 mb-3">当日のご案内</h3>
        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
          <li>
            チェックインは <strong>11:00〜17:00</strong> です
          </li>
          <li>
            チェックアウトは <strong>翌11:00まで</strong> です
          </li>
          <li>
            20:00〜翌5:00は <strong>車の出入り禁止</strong> です
          </li>
          <li>ゴミは必ずお持ち帰りください</li>
        </ul>
      </div>

      <div className="text-center">
        <a
          href="/"
          className="inline-block border border-stone-300 text-stone-600 px-8 py-3 rounded-lg hover:bg-stone-50 transition-colors"
        >
          トップページに戻る
        </a>
      </div>
    </main>
  );
}

// Suspense のフォールバック（useSearchParams 解決待ち）
function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#2D4030] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-stone-600">読み込み中...</p>
      </div>
    </div>
  );
}

export default function BookingCompletePage() {
  return (
    <div className="min-h-screen bg-[#F8F9F4] flex flex-col">
      <header className="bg-[#2D4030] text-white py-6 shadow-md">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold tracking-wider">
            MURA CAMPING GROUND
          </h1>
          <p className="text-sm opacity-80">オンライン予約システム</p>
        </div>
      </header>

      <Suspense fallback={<LoadingFallback />}>
        <BookingCompleteContent />
      </Suspense>

      <footer className="bg-stone-200 py-8 text-center text-stone-500 text-sm mt-auto">
        &copy; 2026 MURA CAMPING GROUND. Powered by murafoundation.com
      </footer>
    </div>
  );
}
