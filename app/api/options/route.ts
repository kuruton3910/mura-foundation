import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/options?exclusive=true — アクティブなレンタルオプション一覧（公開）
// exclusive=true  → 貸し切り専用オプションのみ
// exclusive=false or 未指定 → 通常オプション（is_exclusive_only=false）のみ
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isExclusive = searchParams.get("exclusive") === "true";

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("rental_options")
      .select("id, name, description, price_per_unit, unit_label, max_count, is_exclusive_only")
      .eq("is_active", true)
      .eq("is_exclusive_only", isExclusive)
      .order("sort_order");

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
