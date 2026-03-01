import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/booking/siteSettings";

// GET /api/coupons/validate?code=XXX&isMember=true&vehicleCount=2&nights=2
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase();
  const isMember = searchParams.get("isMember") === "true";
  const vehicleCount = Number(searchParams.get("vehicleCount") ?? 1);
  const nights = Number(searchParams.get("nights") ?? 0);

  if (!code) {
    return NextResponse.json({
      valid: false,
      message: "コードが入力されていません",
    });
  }

  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // 設定から区画料を取得（表示用の概算）
  const { data: settingsData } = await supabase
    .from("site_settings")
    .select("site_fee_weekday")
    .eq("id", 1)
    .single();
  const siteFeePerNight =
    settingsData?.site_fee_weekday ?? DEFAULT_SETTINGS.site_fee_weekday;

  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .single();

  if (!coupon) {
    return NextResponse.json({
      valid: false,
      message: "このクーポンコードは存在しないか無効です",
    });
  }

  // 有効期限チェック
  if (coupon.valid_from && today < coupon.valid_from) {
    return NextResponse.json({
      valid: false,
      message: "このクーポンはまだ有効期間外です",
    });
  }
  if (coupon.valid_until && today > coupon.valid_until) {
    return NextResponse.json({
      valid: false,
      message: "このクーポンは有効期限切れです",
    });
  }

  // 使用回数チェック
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({
      valid: false,
      message: "このクーポンの使用回数上限に達しています",
    });
  }

  // 会員限定チェック
  if (coupon.is_member_only && !isMember) {
    return NextResponse.json({
      valid: false,
      message: "このクーポンはNAKAMAメンバー限定です",
    });
  }

  // 割引額計算（区画料のみに適用、平日料金ベースの概算）
  const siteFee = vehicleCount * siteFeePerNight * nights;
  const discountAmount = Math.floor((siteFee * coupon.discount_percent) / 100);

  return NextResponse.json({
    valid: true,
    discountPercent: coupon.discount_percent,
    discountAmount,
    message: `${coupon.discount_percent}% OFF（区画料より ¥${discountAmount.toLocaleString()} 割引）`,
  });
}
