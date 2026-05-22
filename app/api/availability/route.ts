import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { DailyAvailability } from "@/lib/supabase/types";

// GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from と to パラメータが必要です" },
      { status: 400 },
    );
  }

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("daily_availability")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date");

    if (error) throw error;

    // 期間内で貸し切り予約が入っている日付を抽出
    // 予約はチェックイン〜チェックアウト前日まで滞在するので
    // 「checkout_date > from かつ checkin_date <= to」の予約が対象
    const { data: exclusiveReservations } = await supabase
      .from("reservations")
      .select("checkin_date, checkout_date")
      .eq("is_exclusive", true)
      .in("status", ["pending", "confirmed"])
      .lte("checkin_date", to)
      .gt("checkout_date", from);

    const exclusiveDates = new Set<string>();
    for (const r of exclusiveReservations ?? []) {
      let cur = r.checkin_date as string;
      const end = r.checkout_date as string;
      while (cur < end) {
        if (cur >= from && cur <= to) exclusiveDates.add(cur);
        const [y, m, d] = cur.split("-").map(Number);
        const next = new Date(Date.UTC(y, m - 1, d + 1));
        cur = next.toISOString().split("T")[0];
      }
    }

    return NextResponse.json({
      availability: data as DailyAvailability[],
      exclusiveDates: Array.from(exclusiveDates),
    });
  } catch (err) {
    console.error("availability fetch error:", err);
    return NextResponse.json(
      { error: "空き状況の取得に失敗しました" },
      { status: 500 },
    );
  }
}
