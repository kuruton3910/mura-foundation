import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import { sendConfirmationEmail } from "@/lib/email/send-confirmation";
import { DEFAULT_SETTINGS } from "@/lib/booking/siteSettings";

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

      // 空き状況を更新（booked_sites +1, available_sites -1）
      if (reservation) {
        // site_settingsからmax_sitesを取得（カラムがなければデフォルト5を使用）
        const { data: settingsData } = await supabase
          .from("site_settings")
          .select("*")
          .eq("id", 1)
          .single();
        const defaultMaxSites = (settingsData as Record<string, unknown>)?.max_sites as number ?? 5;

        const checkin = new Date(reservation.checkin_date);
        const checkout = new Date(reservation.checkout_date);
        const sites = reservation.vehicle_count || 1;

        for (let d = new Date(checkin); d < checkout; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];

          const { data: existing } = await supabase
            .from("daily_availability")
            .select("booked_sites, available_sites, max_sites")
            .eq("date", dateStr)
            .single();

          if (existing) {
            // 既存の行を更新
            await supabase
              .from("daily_availability")
              .update({
                booked_sites: (existing.booked_sites ?? 0) + sites,
                available_sites: Math.max(0, (existing.available_sites ?? existing.max_sites) - sites),
              })
              .eq("date", dateStr);
          } else {
            // 行がなければ作成（site_settingsのmax_sitesをデフォルト値として使用）
            await supabase
              .from("daily_availability")
              .insert({
                date: dateStr,
                is_closed: false,
                max_sites: defaultMaxSites,
                booked_sites: sites,
                available_sites: defaultMaxSites - sites,
              });
          }
        }
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
            selectedOptions: reservation.selected_options ?? undefined,
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

    // 決済失敗 / 有効期限切れ → pending のものをキャンセル
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservation_id;

      if (!reservationId) break;

      await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservationId)
        .eq("status", "pending"); // pending のものだけキャンセル

      // pending → cancelled は枠を確保していないので戻す必要なし
      console.log(`Reservation expired/cancelled: ${reservationId}`);
      break;
    }

    // 返金完了 → 枠を戻す
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      if (!paymentIntentId) break;

      // 返金対象の予約を取得（枠を戻すため）
      const { data: refundedReservation } = await supabase
        .from("reservations")
        .select("*")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .single();

      await supabase
        .from("reservations")
        .update({ status: "refunded" })
        .eq("stripe_payment_intent_id", paymentIntentId);

      // 枠を戻す
      if (refundedReservation) {
        const checkin = new Date(refundedReservation.checkin_date);
        const checkout = new Date(refundedReservation.checkout_date);
        const sites = refundedReservation.vehicle_count || 1;

        for (let d = new Date(checkin); d < checkout; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];

          const { data: existing } = await supabase
            .from("daily_availability")
            .select("booked_sites, available_sites, max_sites")
            .eq("date", dateStr)
            .single();

          if (existing) {
            await supabase
              .from("daily_availability")
              .update({
                booked_sites: Math.max(0, (existing.booked_sites ?? 0) - sites),
                available_sites: Math.min(existing.max_sites, (existing.available_sites ?? 0) + sites),
              })
              .eq("date", dateStr);
          }
        }
      }

      console.log(`Reservation refunded: payment_intent ${paymentIntentId}`);
      break;
    }

    default:
      // 未処理のイベントは無視
      break;
  }

  return NextResponse.json({ received: true });
}
