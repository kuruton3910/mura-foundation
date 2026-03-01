import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/options — アクティブなレンタルオプション一覧（公開）
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("rental_options")
      .select("id, name, description, price_per_unit, unit_label, max_count")
      .eq("is_active", true)
      .order("sort_order");

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
