import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/booking/siteSettings";
import { calcSiteFee, type SiteFees } from "@/lib/booking/pricing";
import type { ReservationFormData } from "@/lib/booking/schema";

// GET /api/coupons/validate?code=XXX&isMember=true&vehicleCount=2&nights=2&checkinDate=2026-04-25&checkoutDate=2026-04-27
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase();
  const isMember = searchParams.get("isMember") === "true";
  const vehicleCount = Number(searchParams.get("vehicleCount") ?? 1);
  const checkinDateStr = searchParams.get("checkinDate");
  const checkoutDateStr = searchParams.get("checkoutDate");

  if (!code) {
    return NextResponse.json({
      valid: false,
      message: "コードが入力されていません",
    });
  }

  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // 設定から区画料を取得
  const { data: settingsData } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const siteFees: SiteFees = {
    weekday: settingsData?.site_fee_weekday ?? DEFAULT_SETTINGS.site_fee_weekday,
    weekend: settingsData?.site_fee_weekend ?? DEFAULT_SETTINGS.site_fee_weekend,
  };

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

  // 割引額計算（calcSiteFeeで平日/週末を正確に計算）
  let discountAmount: number;

  if (checkinDateStr && checkoutDateStr) {
    // チェックイン・チェックアウト日が指定されている場合、正確な平日/週末混合料金で計算
    const formData = {
      checkinDate: new Date(checkinDateStr),
      checkoutDate: new Date(checkoutDateStr),
      vehicleCount,
    } as ReservationFormData;
    const siteFee = calcSiteFee(formData, siteFees);
    discountAmount = Math.floor((siteFee * coupon.discount_percent) / 100);
  } else {
    // 後方互換性: 日付が指定されていない場合は平日料金ベースの概算
    const nights = Number(searchParams.get("nights") ?? 0);
    const siteFee = vehicleCount * siteFees.weekday * nights;
    discountAmount = Math.floor((siteFee * coupon.discount_percent) / 100);
  }

  return NextResponse.json({
    valid: true,
    discountPercent: coupon.discount_percent,
    discountAmount,
    message: `${coupon.discount_percent}% OFF（区画料より ¥${discountAmount.toLocaleString()} 割引）`,
  });
}
