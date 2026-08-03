"use client";

import { useState, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reservationSchema,
  defaultFormValues,
  type ReservationFormData,
} from "@/lib/booking/schema";
import StepIndicator from "@/components/booking/StepIndicator";
import OrderSummary from "@/components/booking/OrderSummary";
import StepConditions from "@/components/booking/StepConditions";
import StepTerms from "@/components/booking/StepTerms";
import StepPersonalInfo from "@/components/booking/StepPersonalInfo";
import StepPayment from "@/components/booking/StepPayment";
import { toDateStr } from "@/lib/booking/pricing";

function validateStep1(data: ReservationFormData): string | null {
  if (!data.checkinDate) return "チェックイン日を選択してください。";
  if (!data.checkoutDate) return "チェックアウト日を選択してください。";
  if (data.checkoutDate <= data.checkinDate)
    return "チェックアウト日はチェックイン日より後の日付を選択してください。";
  if (data.adults < 1) return "大人は最低1名必要です。";
  return null;
}

function validateStep2(data: ReservationFormData): string | null {
  if (!data.agreedToTerms) return "利用規約への同意が必要です。";
  return null;
}

type ApiJson = {
  error?: string;
  reservationId?: string;
  checkoutUrl?: string;
};

/**
 * レスポンスをJSONとして安全に読む。
 * サーバー側がタイムアウトしてHTMLを返した場合でも throw せず null を返すため、
 * 「通信エラー」で潰れず本来のエラー内容を出せる。
 */
async function safeJson(res: Response): Promise<ApiJson | null> {
  try {
    return (await res.json()) as ApiJson;
  } catch {
    return null;
  }
}

function validateStep3(data: ReservationFormData): string | null {
  if (!data.guestName.trim()) return "お名前を入力してください。";
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(data.guestEmail))
    return "有効なメールアドレスを入力してください。";
  const phoneRe = /^[\d\-+() ]{10,}$/;
  if (!phoneRe.test(data.guestPhone.replace(/\s/g, "")))
    return "有効な電話番号を入力してください（10桁以上）。";
  if (!/^\d{4}$/.test(data.vehiclePlate))
    return "車のナンバー下4桁を半角数字で入力してください。";
  // 郵便番号: ハイフン有無どちらでも、半角数字7桁を許可
  const postalDigits = data.postalCode.replace(/-/g, "").replace(/\s/g, "");
  if (!/^\d{7}$/.test(postalDigits))
    return "郵便番号を半角数字7桁で入力してください（ハイフン任意）。";
  if (!data.prefecture.trim()) return "都道府県を入力してください。";
  if (!data.city.trim()) return "市区町村を入力してください。";
  if (!data.addressLine.trim()) return "番地以下を入力してください。";
  return null;
}

export default function Page() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // このブラウザのこの予約操作を識別する鍵。
  // 通信タイムアウト後に再送しても同じ値を送るので重複予約を防げる。
  // 推測不可能なので、他人の予約を引き当てることはできない。
  const submissionIdRef = useRef<string>("");
  if (!submissionIdRef.current) {
    submissionIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }

  const methods = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: defaultFormValues,
    mode: "onChange",
  });

  function handleNext() {
    const data = methods.getValues();
    let error: string | null = null;

    if (currentStep === 1) error = validateStep1(data);
    else if (currentStep === 2) error = validateStep2(data);
    else if (currentStep === 3) error = validateStep3(data);

    if (error) {
      setStepError(error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setStepError(null);
    setCurrentStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePrev() {
    setStepError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    const data = methods.getValues();
    const error = validateStep3(data);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setIsSubmitting(true);

    // 決済ページへ遷移する場合は、遷移中に再送信されないようボタンを戻さない
    let redirecting = false;

    try {
      // 日付はローカルTZ基準のYYYY-MM-DD文字列に変換してから送信
      // （Date.toISOString()はUTC変換され、JST midnightだと前日にずれるため）
      const payload = {
        ...data,
        checkinDate: data.checkinDate ? toDateStr(data.checkinDate) : null,
        checkoutDate: data.checkoutDate ? toDateStr(data.checkoutDate) : null,
        // 再送を判定するための鍵（このブラウザ・この予約操作でのみ有効）
        submissionId: submissionIdRef.current,
      };

      // 1. pending 予約を作成
      const reservationRes = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const reservationJson = await safeJson(reservationRes);
      if (!reservationRes.ok || !reservationJson?.reservationId) {
        setStepError(
          reservationJson?.error ||
            "予約の作成に失敗しました。時間をおいてもう一度お試しください。",
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const { reservationId } = reservationJson;

      // 2. Stripe Checkout セッションを作成してリダイレクト
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });
      const checkoutJson = await safeJson(checkoutRes);
      if (!checkoutRes.ok) {
        setStepError(
          checkoutJson?.error ||
            "決済ページの準備に失敗しました。時間をおいてもう一度お試しください。",
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      // checkoutUrl が取れないまま遷移すると真っ白な画面になるため必ず検証する
      const checkoutUrl = checkoutJson?.checkoutUrl;
      if (typeof checkoutUrl !== "string" || !checkoutUrl) {
        setStepError(
          "決済ページのURLを取得できませんでした。時間をおいてもう一度お試しください。",
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      redirecting = true;
      window.location.href = checkoutUrl;
    } catch {
      setStepError("通信エラーが発生しました。もう一度お試しください。");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      if (!redirecting) setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...methods}>
      <div className="bg-[#F8F9F4] text-stone-800 font-sans min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 shadow-sm py-4 md:py-5">
          <div className="container mx-auto px-4 flex justify-between items-center gap-4">
            {/* アイコンマーク＋ワードマークを並べて左上に配置 */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-mark.png"
                alt=""
                aria-hidden="true"
                className="h-10 sm:h-12 md:h-14 w-auto object-contain shrink-0"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="MURA FOUNDATION"
                className="h-10 sm:h-12 md:h-16 w-auto object-contain min-w-0"
              />
            </div>
            <div className="hidden md:block">
              <a
                href="https://www.murafoundation.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#2D4030]/10 text-[#2D4030] px-4 py-2 rounded-full text-sm hover:bg-[#2D4030]/20 transition-colors inline-block"
              >
                www.murafoundation.com
              </a>
            </div>
          </div>
        </header>

        {/* Step indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Main content */}
        <main className="container mx-auto px-4 pb-20">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: step content */}
            <div className="lg:w-2/3 space-y-8">
              {currentStep === 1 && (
                <StepConditions error={stepError ?? undefined} />
              )}
              {currentStep === 2 && (
                <StepTerms error={stepError ?? undefined} />
              )}
              {currentStep === 3 && (
                <StepPersonalInfo error={stepError ?? undefined} />
              )}
              {currentStep === 4 && <StepPayment />}
            </div>

            {/* Right: order summary */}
            <div className="lg:w-1/3">
              <OrderSummary
                currentStep={currentStep}
                onNext={currentStep === 4 ? handleSubmit : handleNext}
                onPrev={handlePrev}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-stone-200 py-8 text-center text-stone-500 text-sm">
          &copy; 2025 by MURA. Proudly created by HelloPrim
        </footer>
      </div>
    </FormProvider>
  );
}
