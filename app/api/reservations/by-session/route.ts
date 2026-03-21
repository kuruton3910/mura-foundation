import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/reservations/by-session?session_id=cs_test_xxx
// → stripe_session_id で予約を取得（完了ページ表示用）
// 認証不要だが、返すフィールドを表示に必要な最小限に制限
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId || !/^cs_(test_|live_)/.test(sessionId)) {
    return NextResponse.json(
      { error: "session_id が必要です" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, guest_name, guest_email, checkin_date, checkout_date, vehicle_count, adults, children, pets, total_amount, discount_amount, coupon_code, selected_options, status, is_exclusive"
    )
    .eq("stripe_session_id", sessionId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "予約が見つかりません" },
      { status: 404 },
    );
  }

  return NextResponse.json({ reservation: data });
}
