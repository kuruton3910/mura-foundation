import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// YYYY-MM-DD文字列のまま日付を1日ずつ進める（タイムゾーンずれ防止）
function getDateRange(checkin: string, checkout: string): string[] {
  const dates: string[] = [];
  let cur = checkin;
  while (cur < checkout) {
    dates.push(cur);
    const [y, m, d] = cur.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    cur = next.toISOString().split("T")[0];
  }
  return dates;
}

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

    // 現在の予約情報を取得（枠の戻し処理用）
    const { data: reservation } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single();

    if (!reservation) {
      return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    }

    const prevStatus = reservation.status;

    // ステータス更新
    const { error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    // confirmed → cancelled/refunded の場合、空き枠を戻す
    if (prevStatus === "confirmed" && (status === "cancelled" || status === "refunded")) {
      const stayDates = getDateRange(reservation.checkin_date, reservation.checkout_date);
      const sites = reservation.vehicle_count || 1;

      for (const dateStr of stayDates) {
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
              available_sites: Math.min(
                existing.max_sites ?? 5,
                (existing.available_sites ?? 0) + sites,
              ),
            })
            .eq("date", dateStr);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("reservation update error:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
