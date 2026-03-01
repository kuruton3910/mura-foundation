import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST /api/admin/availability — upsert an override
export async function POST(request: NextRequest) {
  try {
    const { date, is_closed, available_sites } = await request.json();

    if (!date) {
      return NextResponse.json({ error: "date が必要です" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: override, error } = await supabase
      .from("availability_overrides")
      .upsert({ date, is_closed, available_sites }, { onConflict: "date" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ override });
  } catch (err) {
    console.error("availability upsert error:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE /api/admin/availability — remove an override by date
export async function DELETE(request: NextRequest) {
  try {
    const { date } = await request.json();

    if (!date) {
      return NextResponse.json({ error: "date が必要です" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from("availability_overrides")
      .delete()
      .eq("date", date);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("availability delete error:", err);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
