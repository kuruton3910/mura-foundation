import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/options?exclusive=true — アクティブなレンタルオプション一覧（公開）
// exclusive=true  → 通常オプション + 貸し切り限定オプション の両方
// exclusive=false → 通常オプションのみ（is_exclusive_only=false）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isExclusive = searchParams.get("exclusive") === "true";

    const supabase = createServerClient();
    let query = supabase
      .from("rental_options")
      .select("id, name, description, price_per_unit, unit_label, max_count, is_exclusive_only")
      .eq("is_active", true)
      .order("sort_order");

    // 通常予約のときは「貸切限定」を除外。貸切予約のときは全部表示
    if (!isExclusive) {
      query = query.eq("is_exclusive_only", false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
