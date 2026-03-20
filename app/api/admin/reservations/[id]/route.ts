import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 認証チェック
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    const allowed = ["confirmed", "cancelled", "refunded"];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: "無効なステータスです" },
        { status: 400 },
      );
    }

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
