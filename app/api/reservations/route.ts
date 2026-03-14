import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { calcTotal, calcSiteFee, type RentalOption, type SiteFees, type PersonFees, DEFAULT_PERSON_FEES } from "@/lib/booking/pricing";
import type { ReservationFormData } from "@/lib/booking/schema";
import { DEFAULT_SETTINGS } from "@/lib/booking/siteSettings";

// POST /api/reservations — pending 予約を作成して reservation_id を返す
export async function POST(request: NextRequest) {
  try {
    const body: ReservationFormData & { couponCode?: string } =
      await request.json();

    // 日付の検証
    const checkin = new Date(body.checkinDate as unknown as string);
    const checkout = new Date(body.checkoutDate as unknown as string);

    if (!checkin || !checkout || checkout <= checkin) {
      return NextResponse.json({ error: "日付が無効です" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkin < today) {
      return NextResponse.json(
        { error: "過去の日付は予約できません" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // ── レンタルオプション一覧を取得 ──────────────────────────────────
    const isExclusive = body.isExclusive === true;
    const { data: optionsData } = await supabase
      .from("rental_options")
      .select("id, name, price_per_unit, unit_label, max_count, description")
      .eq("is_active", true)
      .eq("is_exclusive_only", isExclusive);
    const options: RentalOption[] = optionsData ?? [];

    // ── サイト設定をDBから取得 ────────────────────────────────────────
    const { data: settingsData } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();
    const settings = { ...DEFAULT_SETTINGS, ...(settingsData ?? {}) };

    // ── 区画料（平日/週末） ──────────────────────────────────────────
    const siteFees: SiteFees = {
      weekday: settings.site_fee_weekday ?? DEFAULT_SETTINGS.site_fee_weekday,
      weekend: settings.site_fee_weekend ?? DEFAULT_SETTINGS.site_fee_weekend,
    };

    // ── 人数料金 ─────────────────────────────────────────────────────
    const personFees: PersonFees = {
      includedPersonsPerSite: settings.included_persons_per_site ?? DEFAULT_PERSON_FEES.includedPersonsPerSite,
      extraPersonFeePerNight: settings.extra_person_fee_per_night ?? DEFAULT_PERSON_FEES.extraPersonFeePerNight,
    };

    // ── 予約受付期間チェック ──────────────────────────────────────────
    const maxDays = body.isMember
      ? settings.booking_window_member_days
      : settings.booking_window_days;
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + maxDays);

    if (checkin > maxDate) {
      return NextResponse.json(
        {
          error: `${body.isMember ? "NAKAMAメンバー" : "一般のお客様"}は${maxDays}日先までの予約が可能です。この日程はまだ予約受付開始前です。`,
        },
        { status: 400 },
      );
    }

    // ── シーズン制限 ─────────────────────────────────────────────────
    const seasonOpen = new Date(
      checkin.getFullYear(),
      settings.season_open_month - 1,
      settings.season_open_day,
    );
    const seasonClose = new Date(
      checkin.getFullYear(),
      settings.season_close_month - 1,
      settings.season_close_day,
    );
    const memberClose = new Date(
      checkin.getFullYear(),
      settings.member_close_month - 1,
      settings.member_close_day,
    );

    if (checkin < seasonOpen) {
      return NextResponse.json(
        {
          error: `${settings.season_open_month}月${settings.season_open_day}日以前のご予約は受け付けておりません。`,
        },
        { status: 400 },
      );
    }

    if (checkin > seasonClose && !body.isMember) {
      return NextResponse.json(
        {
          error: `${settings.season_close_month}月以降の予約はNAKAMAメンバーのみ受付しております。`,
        },
        { status: 400 },
      );
    }

    if (checkin > memberClose) {
      return NextResponse.json(
        { error: "この時期は予約受付を行っておりません。" },
        { status: 400 },
      );
    }

    // 必須項目の検証
    if (!body.guestName?.trim() || !body.guestEmail?.trim() || !body.guestPhone?.trim()) {
      return NextResponse.json(
        { error: "予約者情報が不足しています" },
        { status: 400 },
      );
    }

    // 空き状況の確認
    const checkinStr = checkin.toISOString().split("T")[0];
    const checkoutStr = checkout.toISOString().split("T")[0];

    const { data: availability, error: availError } = await supabase
      .from("daily_availability")
      .select("date, available_sites, booked_sites, max_sites, is_closed")
      .gte("date", checkinStr)
      .lt("date", checkoutStr);

    if (availError) throw availError;

    // 貸し切りリクエストの場合: 全日程で全枠が空いている必要がある
    if (isExclusive) {
      const notAllFree = availability?.find(
        (d) => d.is_closed || (d.booked_sites ?? 1) > 0,
      );
      if (notAllFree) {
        return NextResponse.json(
          { error: `${notAllFree.date} にすでに予約が入っているため、貸し切りリクエストはできません` },
          { status: 409 },
        );
      }
    } else {
      const unavailable = availability?.find(
        (d) => d.is_closed || (d.available_sites ?? Infinity) < body.vehicleCount,
      );
      if (unavailable) {
        return NextResponse.json(
          { error: `${unavailable.date} は空き区画が不足しています` },
          { status: 409 },
        );
      }
    }

    // 合計金額の計算（サーバー側で再計算してフロントの改ざん防止）
    const formDataWithDates = {
      ...body,
      checkinDate: checkin,
      checkoutDate: checkout,
    };
    const baseTotal = calcTotal(formDataWithDates, options, siteFees, personFees);

    // ── クーポン検証 ──────────────────────────────────────────────────
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    const couponCode = body.couponCode?.trim().toUpperCase();
    if (couponCode) {
      const today2 = new Date().toISOString().split("T")[0];
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode)
        .eq("is_active", true)
        .single();

      if (coupon) {
        const withinDates =
          (!coupon.valid_from || today2 >= coupon.valid_from) &&
          (!coupon.valid_until || today2 <= coupon.valid_until);
        const withinUses =
          coupon.max_uses === null || coupon.used_count < coupon.max_uses;
        const memberOk = !coupon.is_member_only || body.isMember;

        if (withinDates && withinUses && memberOk) {
          const siteFee = calcSiteFee(formDataWithDates, siteFees);
          discountAmount = Math.floor(
            (siteFee * coupon.discount_percent) / 100,
          );
          appliedCouponCode = couponCode;

          // used_count をインクリメント
          await supabase
            .from("coupons")
            .update({ used_count: coupon.used_count + 1 })
            .eq("id", coupon.id);
        }
      }
    }

    const totalAmount = Math.max(0, baseTotal - discountAmount);

    // ── 選択されたオプションをJSONBとして整形 ─────────────────────────
    const optionCounts = body.optionCounts ?? {};
    const selectedOptions = options
      .filter((opt) => (optionCounts[opt.id] ?? 0) > 0)
      .map((opt) => ({
        id: opt.id,
        name: opt.name,
        count: optionCounts[opt.id],
        unit_label: opt.unit_label,
        price_per_unit: opt.price_per_unit,
        subtotal: optionCounts[opt.id] * opt.price_per_unit,
      }));

    // 予約を pending で作成
    const { data: reservation, error: insertError } = await supabase
      .from("reservations")
      .insert({
        guest_name: body.guestName.trim(),
        guest_email: body.guestEmail.trim().toLowerCase(),
        guest_phone: body.guestPhone.trim(),
        notes: body.notes || "",
        is_member: body.isMember,
        checkin_date: checkinStr,
        checkout_date: checkoutStr,
        vehicle_count: body.vehicleCount,
        adults: body.adults,
        children: body.children,
        pets: body.pets,
        selected_options: selectedOptions,
        total_amount: totalAmount,
        coupon_code: appliedCouponCode,
        discount_amount: discountAmount,
        terms_agreed_at: new Date().toISOString(),
        status: "pending",
        is_exclusive: isExclusive,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ reservationId: reservation.id, totalAmount });
  } catch (err) {
    console.error("reservation create error:", err);
    return NextResponse.json(
      { error: "予約の作成に失敗しました" },
      { status: 500 },
    );
  }
}
