import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/booking/siteSettings";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();
    return NextResponse.json(data ?? DEFAULT_SETTINGS);
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("site_settings")
      .upsert({ id: 1, ...body, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("settings update error:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
