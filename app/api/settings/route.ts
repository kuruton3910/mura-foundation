import { NextResponse } from "next/server";
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
