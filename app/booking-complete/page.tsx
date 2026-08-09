"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Reservation } from "@/lib/supabase/types";
import { formatDate } from "@/lib/booking/pricing";

const MAX_ATTEMPTS = 5;
const FETCH_TIMEOUT_MS = 8000;

/**
 * タイムアウト付き fetch。
 * 通信エラー・タイムアウトでも throw せず null を返すため、
 * 呼び出し側でスピナーが回り続ける事故を防げる。
 */
async function fetchOnce(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// useSearchParams() は Suspense でラップが必要なため内部コンポーネントに分離
function BookingCompleteContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // 手動リトライ用。値が変わると useEffect が再実行される
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setError("セッションIDが見つかりません");
      setLoading(false);
      return;
    }

    // アンマウント・再実行時に古い処理が state を書き換えないようにする
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAttempt(0);

    async function fetchReservation() {
      try {
        // Webhook 処理待ちのためリトライ（最大5回）
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          if (cancelled) return;
          setAttempt(i + 1);

          await new Promise((r) => setTimeout(r, i === 0 ? 1200 : 3000));
          if (cancelled) return;

          const res = await fetchOnce(
            `/api/reservations/by-session?session_id=${encodeURIComponent(sessionId!)}`,
          );

          // 通信エラー・タイムアウト → 次の試行へ
          if (!res) continue;

          if (res.ok) {
            const json = await res.json().catch(() => null);
            if (json?.reservation) {
              if (cancelled) return;
              setReservation(json.reservation as Reservation);
              return;
            }
            continue;
          }

          // session_id の形式が不正（400）はリトライしても変わらないので即終了
          if (res.status === 400) {
            if (cancelled) return;
            setError("決済セッションの情報が正しく受け取れませんでした。");
            return;
          }
        }

        if (cancelled) return;
        setError(
          "予約情報の反映に時間がかかっています。決済が完了している場合は確認メールが届きますのでご安心ください。",
        );
      } catch {
        if (cancelled) return;
        setError("予約情報の取得中にエラーが発生しました。");
      } finally {
        // どの経路を通っても必ずスピナーを止める
        if (!cancelled) setLoading(false);
      }
    }

    fetchReservation();
    return () => {
      cancelled = true;
    };
  }, [sessionId, retryKey]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2D4030] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600">予約情報を確認しています...</p>
          <p className="text-xs text-stone-400 mt-2">
            確認中（{attempt}/{MAX_ATTEMPTS}）— 数十秒かかる場合があります
          </p>
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
            予約情報を表示できませんでした
          </h1>
          <p className="text-stone-500 text-sm mb-4">
            {error || "予約情報が見つかりませんでした"}
          </p>

          {/* 決済済みのお客様を不安にさせないための案内 */}
          {sessionId && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 text-left">
              <p className="font-bold mb-1">ご決済は完了している可能性があります</p>
              <p>
                この画面が表示されても、決済が完了していればご予約は成立しています。
                確認メールをご確認ください。届いていない場合はお問い合わせください。
              </p>
            </div>
          )}

          <div className="space-y-2">
            {sessionId && (
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="w-full bg-[#2D4030] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#2D4030]/80 transition-colors"
              >
                もう一度確認する
              </button>
            )}
            <a
              href="/"
              className="block w-full border border-stone-300 text-stone-600 px-6 py-3 rounded-lg font-medium hover:bg-stone-50 transition-colors"
            >
              予約ページに戻る
            </a>
          </div>
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

            {reservation.vehicle_plate && (
              <>
                <span className="text-gray-500">車のナンバー</span>
                <span className="font-bold">{reservation.vehicle_plate}</span>
              </>
            )}

            {(reservation.postal_code || reservation.prefecture) && (
              <>
                <span className="text-gray-500">ご住所</span>
                <span className="font-bold">
                  {reservation.postal_code && `〒${reservation.postal_code} `}
                  {reservation.prefecture}{reservation.city}{reservation.address_line}
                </span>
              </>
            )}

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

            {(reservation.selected_options && reservation.selected_options.length > 0) && (
              <>
                <span className="text-gray-500 col-span-2 mt-1 font-medium">
                  追加オプション
                </span>
                {reservation.selected_options.map((opt) => (
                  <React.Fragment key={opt.id}>
                    <span className="text-gray-500 pl-3">{opt.name}</span>
                    <span className="font-bold">
                      {opt.count}{opt.unit_label}（¥{opt.subtotal.toLocaleString()}）
                    </span>
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Important rules reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
        <h3 className="font-bold text-amber-900 mb-3">当日のご案内</h3>
        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
          <li>
            チェックインは <strong>11:00〜</strong> です
          </li>
          <li>
            チェックアウトは <strong>翌11:00まで</strong> です
          </li>
          <li>
            19:00〜翌5:00は <strong>車の出入り禁止</strong> です
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
      <header className="bg-white border-b border-stone-200 shadow-sm py-4">
        <div className="container mx-auto px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="MURA FOUNDATION"
            className="h-12 sm:h-16 md:h-20 w-auto object-contain"
          />
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
