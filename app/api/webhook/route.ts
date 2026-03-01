import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";

// Stripe は生のリクエストボディで署名検証するため Next.js のパース無効化
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  // Stripe クライアントをリクエスト時に初期化（ビルド時に環境変数を参照しない）
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerClient();

  switch (event.type) {
    // 決済完了 → 予約を confirmed に更新
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservation_id;

      if (!reservationId) break;

      const { error } = await supabase
        .from("reservations")
        .update({
          status: "confirmed",
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", reservationId);

      if (error) {
        console.error("Failed to confirm reservation:", error);
        return NextResponse.json(
          { error: "DB update failed" },
          { status: 500 },
        );
      }

      console.log(`Reservation confirmed: ${reservationId}`);
      break;
    }

    // 決済失敗 / 有効期限切れ → pending のまま（キャンセルしない）
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservation_id;

      if (!reservationId) break;

      await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservationId)
        .eq("status", "pending"); // pending のものだけキャンセル

      console.log(`Reservation expired/cancelled: ${reservationId}`);
      break;
    }

    // 返金完了
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      if (!paymentIntentId) break;

      await supabase
        .from("reservations")
        .update({ status: "refunded" })
        .eq("stripe_payment_intent_id", paymentIntentId);

      console.log(`Reservation refunded: payment_intent ${paymentIntentId}`);
      break;
    }

    default:
      // 未処理のイベントは無視
      break;
  }

  return NextResponse.json({ received: true });
}
