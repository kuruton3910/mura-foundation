import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { calcTotal } from "@/lib/booking/pricing";
import type { ReservationFormData } from "@/lib/booking/schema";

// POST /api/reservations — pending 予約を作成して reservation_id を返す
export async function POST(request: NextRequest) {
  try {
    const body: ReservationFormData = await request.json();

    // 日付の検証
    const checkin = new Date(body.checkinDate as unknown as string);
    const checkout = new Date(body.checkoutDate as unknown as string);

    if (!checkin || !checkout || checkout <= checkin) {
      return NextResponse.json({ error: "日付が無効です" }, { status: 400 });
    }

    // 必須項目の検証
    if (
      !body.guestName?.trim() ||
      !body.guestEmail?.trim() ||
      !body.guestPhone?.trim()
    ) {
      return NextResponse.json(
        { error: "予約者情報が不足しています" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // 空き状況の確認
    const checkinStr = checkin.toISOString().split("T")[0];
    const checkoutStr = checkout.toISOString().split("T")[0];

    const { data: availability, error: availError } = await supabase
      .from("daily_availability")
      .select("date, available_sites, is_closed")
      .gte("date", checkinStr)
      .lt("date", checkoutStr);

    if (availError) throw availError;

    const unavailable = availability?.find(
      (d) => d.is_closed || d.available_sites < body.vehicleCount,
    );

    if (unavailable) {
      return NextResponse.json(
        { error: `${unavailable.date} は空き区画が不足しています` },
        { status: 409 },
      );
    }

    // 合計金額の計算（サーバー側で再計算してフロントの改ざん防止）
    const formDataWithDates = {
      ...body,
      checkinDate: checkin,
      checkoutDate: checkout,
    };
    const totalAmount = calcTotal(formDataWithDates);

    // 予約を pending で作成
    const { data: reservation, error: insertError } = await supabase
      .from("reservations")
      .insert({
        guest_name: body.guestName.trim(),
        guest_email: body.guestEmail.trim().toLowerCase(),
        guest_phone: body.guestPhone.trim(),
        notes: body.notes || "",
        is_member: body.isMember,
        checkin_date: checkinStr,
        checkout_date: checkoutStr,
        vehicle_count: body.vehicleCount,
        adults: body.adults,
        children: body.children,
        pets: body.pets,
        rental_tent: body.rentalTent,
        rental_tent_count: body.rentalTent ? body.rentalTentCount : 0,
        rental_firepit: body.rentalFirepit,
        rental_firepit_count: body.rentalFirepit ? body.rentalFirepitCount : 0,
        total_amount: totalAmount,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ reservationId: reservation.id, totalAmount });
  } catch (err) {
    console.error("reservation create error:", err);
    return NextResponse.json(
      { error: "予約の作成に失敗しました" },
      { status: 500 },
    );
  }
}
