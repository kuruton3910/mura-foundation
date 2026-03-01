import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from);
  const end = new Date(to);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// POST /api/admin/availability
// Single:  { date, is_closed, available_sites }
// Bulk:    { from, to, is_closed, available_sites }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { is_closed, available_sites } = body;
    const supabase = createServerClient();

    // --- 一括設定 ---
    if (body.from && body.to) {
      const dates = generateDateRange(body.from, body.to);
      const rows = dates.map((d) => ({
        date: d,
        is_closed: is_closed ?? false,
        max_sites: available_sites ?? null,
      }));

      const { error } = await supabase
        .from("availability_overrides")
        .upsert(rows, { onConflict: "date" });

      if (error) throw error;
      return NextResponse.json({ ok: true, count: rows.length });
    }

    // --- 1件設定 ---
    const { date } = body;
    if (!date) {
      return NextResponse.json({ error: "date が必要です" }, { status: 400 });
    }

    const { data: override, error } = await supabase
      .from("availability_overrides")
      .upsert({ date, is_closed, max_sites: available_sites }, { onConflict: "date" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ override });
  } catch (err) {
    console.error("availability upsert error:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE /api/admin/availability
// Single:  { date }
// Bulk:    { from, to }
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    // --- 一括解除 ---
    if (body.from && body.to) {
      const dates = generateDateRange(body.from, body.to);
      const { error } = await supabase
        .from("availability_overrides")
        .delete()
        .in("date", dates);

      if (error) throw error;
      return NextResponse.json({ ok: true, count: dates.length });
    }

    // --- 1件解除 ---
    const { date } = body;
    if (!date) {
      return NextResponse.json({ error: "date が必要です" }, { status: 400 });
    }

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
