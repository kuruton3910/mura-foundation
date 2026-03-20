"use client";

import { useState } from "react";
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

function validateStep3(data: ReservationFormData): string | null {
  if (!data.guestName.trim()) return "お名前を入力してください。";
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(data.guestEmail))
    return "有効なメールアドレスを入力してください。";
  const phoneRe = /^[\d\-+() ]{10,}$/;
  if (!phoneRe.test(data.guestPhone.replace(/\s/g, "")))
    return "有効な電話番号を入力してください（10桁以上）。";
  return null;
}

export default function Page() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    try {
      // 1. pending 予約を作成
      const reservationRes = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!reservationRes.ok) {
        const { error: msg } = await reservationRes.json();
        setStepError(msg || "予約の作成に失敗しました");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const { reservationId } = await reservationRes.json();

      // 2. Stripe Checkout セッションを作成してリダイレクト
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });
      if (!checkoutRes.ok) {
        const { error: msg } = await checkoutRes.json();
        setStepError(msg || "決済セッションの作成に失敗しました");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const { checkoutUrl } = await checkoutRes.json();
      window.location.href = checkoutUrl;
    } catch {
      setStepError("通信エラーが発生しました。もう一度お試しください。");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...methods}>
      <div className="bg-[#F8F9F4] text-stone-800 font-sans min-h-screen">
        {/* Header */}
        <header className="bg-[#2D4030] text-white py-6 shadow-md">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-wider">
                NPO MURA FOUNDATION
              </h1>
              <p className="text-sm opacity-80">オンライン予約システム</p>
            </div>
            <div className="hidden md:block">
              <a
                href="https://www.murafoundation.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 px-4 py-2 rounded-full text-sm hover:bg-white/20 transition-colors inline-block"
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
