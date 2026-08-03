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
    // select("*") にすることで image_url カラムが未追加のDBでも 500 にならない。
    // （カラム名を明示すると未追加時に PGRST204 で落ち、予約画面が全滅する）
    let query = supabase
      .from("rental_options")
      .select("*")
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
