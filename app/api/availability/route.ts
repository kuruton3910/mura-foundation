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

    return NextResponse.json({ availability: data as DailyAvailability[] });
  } catch (err) {
    console.error("availability fetch error:", err);
    return NextResponse.json(
      { error: "空き状況の取得に失敗しました" },
      { status: 500 },
    );
  }
}
