import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/reservations/by-session?session_id=cs_test_xxx
// → stripe_session_id で予約を取得（RLSを回避してサーバー側で取得）
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id が必要です" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
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
