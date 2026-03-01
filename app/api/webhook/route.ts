import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import { sendConfirmationEmail } from "@/lib/email/send-confirmation";

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
    // 決済完了 → 予約を confirmed に更新 + 確認メール送信
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservation_id;

      if (!reservationId) break;

      // 確認前に予約情報を取得（メール送信用）
      const { data: reservation } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .single();

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

      // 確認メール送信（失敗しても予約確定には影響させない）
      if (reservation) {
        try {
          await sendConfirmationEmail({
            guestEmail: reservation.guest_email,
            guestName: reservation.guest_name,
            reservationId: reservation.id,
            checkinDate: reservation.checkin_date,
            checkoutDate: reservation.checkout_date,
            vehicleCount: reservation.vehicle_count,
            adults: reservation.adults,
            children: reservation.children,
            pets: reservation.pets,
            totalAmount: reservation.total_amount,
            discountAmount: reservation.discount_amount ?? 0,
            couponCode: reservation.coupon_code ?? undefined,
            rentalTent: reservation.rental_tent,
            rentalTentCount: reservation.rental_tent_count,
            rentalFirepit: reservation.rental_firepit,
            rentalFirepitCount: reservation.rental_firepit_count,
          });
          console.log(`Confirmation email sent to ${reservation.guest_email}`);
        } catch (emailErr) {
          console.error("Failed to send confirmation email:", emailErr);
          // メール失敗は無視して予約確定を継続
        }
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
