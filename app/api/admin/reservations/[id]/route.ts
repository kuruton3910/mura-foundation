import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 認証は middleware.ts で実施済み
    const supabase = createServerClient();

    const { id } = await params;
    const { status } = await request.json();

    const allowed = ["confirmed", "cancelled", "refunded"];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: "無効なステータスです" },
        { status: 400 },
      );
    }

    // 予約の存在確認
    const { data: reservation } = await supabase
      .from("reservations")
      .select("id")
      .eq("id", id)
      .single();

    if (!reservation) {
      return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    }

    // ステータス更新
    // 空き枠（daily_availability）は reservations を集計する VIEW のため、
    // ステータスを cancelled/refunded にすれば自動で枠が戻る（手動更新は不要・VIEWは更新不可）
    const { error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("reservation update error:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
