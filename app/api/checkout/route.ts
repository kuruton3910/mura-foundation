import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";

// POST /api/checkout
// body: { reservationId: string }
// → Stripe Checkout セッションを作成してURLを返す
export async function POST(request: NextRequest) {
  try {
    const { reservationId } = await request.json();

    if (!reservationId) {
      return NextResponse.json(
        { error: "reservationId が必要です" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // 予約情報を取得
    const { data: reservation, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .eq("status", "pending")
      .single();

    if (error || !reservation) {
      return NextResponse.json(
        { error: "予約が見つかりません" },
        { status: 404 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Stripe クライアントをリクエスト時に初期化（ビルド時に環境変数を参照しない）
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Stripe Checkout セッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      locale: "ja",
      customer_email: reservation.guest_email,
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: "MURA CAMPING GROUND 宿泊予約",
              description: `${reservation.checkin_date} 〜 ${reservation.checkout_date} / ${reservation.vehicle_count}区画 / 大人${reservation.adults}名${reservation.discount_amount > 0 ? ` / クーポン割引 -¥${reservation.discount_amount.toLocaleString()}` : ""}`,
            },
            unit_amount: reservation.total_amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        reservation_id: reservationId,
      },
      success_url: `${appUrl}/booking-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?cancelled=true`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30分で失効
    });

    // stripe_session_id を予約レコードに保存
    await supabase
      .from("reservations")
      .update({ stripe_session_id: session.id })
      .eq("id", reservationId);

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    return NextResponse.json(
      { error: "決済セッションの作成に失敗しました" },
      { status: 500 },
    );
  }
}
