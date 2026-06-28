import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  calcTotal,
  calcSiteFee,
  type RentalOption,
  type SiteFees,
  type PersonFees,
  type PeakSeason,
  type ExclusiveFees,
  DEFAULT_PERSON_FEES,
  DEFAULT_PEAK_SEASON,
  DEFAULT_EXCLUSIVE_FEES,
} from "@/lib/booking/pricing";
import type { ReservationFormData } from "@/lib/booking/schema";
import { DEFAULT_SETTINGS } from "@/lib/booking/siteSettings";

// POST /api/reservations — pending 予約を作成して reservation_id を返す
export async function POST(request: NextRequest) {
  try {
    const body: ReservationFormData & { couponCode?: string } =
      await request.json();

    // 日付の検証（YYYY-MM-DD文字列で処理し、タイムゾーンずれを防止）
    const checkinRaw = (body.checkinDate as unknown as string).split("T")[0];
    const checkoutRaw = (body.checkoutDate as unknown as string).split("T")[0];

    if (!checkinRaw || !checkoutRaw || !/^\d{4}-\d{2}-\d{2}$/.test(checkinRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(checkoutRaw)) {
      return NextResponse.json({ error: "日付が無効です" }, { status: 400 });
    }

    // UTCで日付オブジェクトを作成（比較・計算用）
    const [cy, cm, cd] = checkinRaw.split("-").map(Number);
    const [oy, om, od] = checkoutRaw.split("-").map(Number);
    const checkin = new Date(Date.UTC(cy, cm - 1, cd));
    const checkout = new Date(Date.UTC(oy, om - 1, od));

    if (checkout <= checkin) {
      return NextResponse.json({ error: "日付が無効です" }, { status: 400 });
    }

    // 今日の日付もUTCベースで統一（日本時間での「今日」を使用）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayUTC = new Date(Date.UTC(nowJST.getUTCFullYear(), nowJST.getUTCMonth(), nowJST.getUTCDate()));

    if (checkin < todayUTC) {
      return NextResponse.json(
        { error: "過去の日付は予約できません" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // ── レンタルオプション一覧を取得 ──────────────────────────────────
    // 通常予約：is_exclusive_only=false のみ
    // 貸し切り予約：全アクティブオプション（通常 + 貸し切り限定）
    const isExclusive = body.isExclusive === true;
    let optionsQuery = supabase
      .from("rental_options")
      .select("id, name, price_per_unit, unit_label, max_count, description")
      .eq("is_active", true);
    if (!isExclusive) {
      optionsQuery = optionsQuery.eq("is_exclusive_only", false);
    }
    const { data: optionsData } = await optionsQuery;
    const options: RentalOption[] = optionsData ?? [];

    // ── サイト設定をDBから取得 ────────────────────────────────────────
    const { data: settingsData } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();
    const settings = { ...DEFAULT_SETTINGS, ...(settingsData ?? {}) };

    // ── 最大連泊数チェック ───────────────────────────────────────────
    const stayNights = Math.round((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
    const maxStayNights = settings.max_stay_nights ?? DEFAULT_SETTINGS.max_stay_nights;
    if (stayNights > maxStayNights) {
      return NextResponse.json(
        {
          error: `連続宿泊は最大${maxStayNights}泊までです。${maxStayNights + 1}泊以上をご希望の場合は直接メールでお問い合わせください。`,
        },
        { status: 400 },
      );
    }

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

    // ── ピークシーズン ───────────────────────────────────────────────
    const peakSeason: PeakSeason = {
      startMonth: settings.peak_season_start_month ?? DEFAULT_PEAK_SEASON.startMonth,
      startDay: settings.peak_season_start_day ?? DEFAULT_PEAK_SEASON.startDay,
      endMonth: settings.peak_season_end_month ?? DEFAULT_PEAK_SEASON.endMonth,
      endDay: settings.peak_season_end_day ?? DEFAULT_PEAK_SEASON.endDay,
    };

    // ── 貸し切り料金 ─────────────────────────────────────────────────
    const exclusiveFees: ExclusiveFees = {
      weekday: settings.exclusive_fee_weekday ?? DEFAULT_EXCLUSIVE_FEES.weekday,
      weekend: settings.exclusive_fee_weekend ?? DEFAULT_EXCLUSIVE_FEES.weekend,
      maxPersons: settings.exclusive_max_persons ?? DEFAULT_EXCLUSIVE_FEES.maxPersons,
    };

    // ── 貸し切り時の人数上限チェック ─────────────────────────────────
    if (isExclusive) {
      const totalPersons = (body.adults ?? 0) + (body.children ?? 0) + (body.pets ?? 0);
      if (totalPersons > exclusiveFees.maxPersons) {
        return NextResponse.json(
          {
            error: `貸し切りの最大人数は${exclusiveFees.maxPersons}名までです。${exclusiveFees.maxPersons + 1}名以上は別料金が発生するため、直接お問い合わせください。`,
          },
          { status: 400 },
        );
      }
    }

    // ── 予約受付期間チェック ──────────────────────────────────────────
    const maxDays = body.isMember
      ? settings.booking_window_member_days
      : settings.booking_window_days;
    const maxDate = new Date(todayUTC);
    maxDate.setUTCDate(maxDate.getUTCDate() + maxDays);

    if (checkin > maxDate) {
      return NextResponse.json(
        {
          error: `${body.isMember ? "NAKAMAメンバー" : "一般のお客様"}は${maxDays}日先までの予約が可能です。この日程はまだ予約受付開始前です。`,
        },
        { status: 400 },
      );
    }

    // ── シーズン制限（UTCベースで比較）────────────────────────────────
    const seasonOpen = new Date(Date.UTC(
      cy, settings.season_open_month - 1, settings.season_open_day,
    ));
    const seasonClose = new Date(Date.UTC(
      cy, settings.season_close_month - 1, settings.season_close_day,
    ));
    const memberClose = new Date(Date.UTC(
      cy, settings.member_close_month - 1, settings.member_close_day,
    ));

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

    // 車のナンバー下4桁（半角数字）の検証
    if (!body.vehiclePlate || !/^\d{4}$/.test(body.vehiclePlate)) {
      return NextResponse.json(
        { error: "車のナンバー下4桁を半角数字で入力してください" },
        { status: 400 },
      );
    }

    // 住所の検証（郵便番号7桁、都道府県・市区町村・番地以下が必須）
    const postalDigits = (body.postalCode ?? "").replace(/[-\s]/g, "");
    if (!/^\d{7}$/.test(postalDigits)) {
      return NextResponse.json(
        { error: "郵便番号を半角数字7桁で入力してください" },
        { status: 400 },
      );
    }
    if (!body.prefecture?.trim() || !body.city?.trim() || !body.addressLine?.trim()) {
      return NextResponse.json(
        { error: "住所が不足しています" },
        { status: 400 },
      );
    }

    // 空き状況の確認
    const checkinStr = checkinRaw;
    const checkoutStr = checkoutRaw;

    const { data: availability, error: availError } = await supabase
      .from("daily_availability")
      .select("date, available_sites, booked_sites, max_sites, is_closed")
      .gte("date", checkinStr)
      .lt("date", checkoutStr);

    if (availError) throw availError;

    // 管理者が手動で「貸切」マークした日も取得（他チャンネル経由の貸切予約用）
    const { data: manualExclusiveBlocks } = await supabase
      .from("availability_overrides")
      .select("date")
      .eq("is_exclusive_blocked", true)
      .gte("date", checkinStr)
      .lt("date", checkoutStr);
    const manualExclusiveSet = new Set<string>(
      (manualExclusiveBlocks ?? []).map((r) => r.date as string),
    );

    // 既存の貸切予約（pending or confirmed）が入っている日を取得
    const { data: existingExclusiveReservations } = await supabase
      .from("reservations")
      .select("checkin_date, checkout_date")
      .eq("is_exclusive", true)
      .in("status", ["pending", "confirmed"])
      .lte("checkin_date", checkoutStr)
      .gt("checkout_date", checkinStr);
    const existingExclusiveSet = new Set<string>();
    for (const r of existingExclusiveReservations ?? []) {
      let cur = r.checkin_date as string;
      const end = r.checkout_date as string;
      while (cur < end) {
        existingExclusiveSet.add(cur);
        const [y, m, d] = cur.split("-").map(Number);
        const next = new Date(Date.UTC(y, m - 1, d + 1));
        cur = next.toISOString().split("T")[0];
      }
    }

    // DBから取得したmax_sitesのデフォルト値（site_settingsにmax_sitesがあればそれを使用）
    const defaultMaxSites = (settingsData as Record<string, unknown>)?.max_sites as number ?? 5;

    // チェックイン〜チェックアウトの全日付を生成し、availability配列をマップに変換
    const availMap = new Map<string, { available_sites: number | null; booked_sites: number | null; max_sites: number | null; is_closed: boolean }>();
    for (const row of availability ?? []) {
      availMap.set(row.date, row);
    }

    // 全日付をループして空き状況を確認（YYYY-MM-DD文字列で処理、タイムゾーンずれ防止）
    let curDate = checkinStr;
    while (curDate < checkoutStr) {
      const dateStr = curDate;
      const row = availMap.get(dateStr);

      // 手動「貸切」マーク or 既存貸切予約がある日は予約不可
      if (manualExclusiveSet.has(dateStr) || existingExclusiveSet.has(dateStr)) {
        return NextResponse.json(
          { error: `${dateStr} は貸切のため予約できません` },
          { status: 409 },
        );
      }

      if (isExclusive) {
        // 貸し切りリクエストの場合: 全日程で全枠が空いている必要がある
        if (row) {
          if (row.is_closed || (row.booked_sites ?? 0) > 0) {
            return NextResponse.json(
              { error: `${dateStr} にすでに予約が入っているため、貸し切りリクエストはできません` },
              { status: 409 },
            );
          }
        }
        // レコードがない日は予約ゼロなので貸し切り可能
      } else {
        // 通常予約の場合: 空き区画が足りているか確認
        if (row) {
          if (row.is_closed || (row.available_sites ?? (row.max_sites ?? defaultMaxSites)) < body.vehicleCount) {
            return NextResponse.json(
              { error: `${dateStr} は空き区画が不足しています` },
              { status: 409 },
            );
          }
        } else {
          // レコードがない日はデフォルトmax_sitesが空き枠
          if (defaultMaxSites < body.vehicleCount) {
            return NextResponse.json(
              { error: `${dateStr} は空き区画が不足しています` },
              { status: 409 },
            );
          }
        }
      }
      // 次の日へ（YYYY-MM-DD文字列で進める）
      const [y, m, day] = curDate.split("-").map(Number);
      const next = new Date(Date.UTC(y, m - 1, day + 1));
      curDate = next.toISOString().split("T")[0];
    }

    // 合計金額の計算（サーバー側で再計算してフロントの改ざん防止）
    const formDataWithDates = {
      ...body,
      checkinDate: checkin,
      checkoutDate: checkout,
    };
    const baseTotal = calcTotal(formDataWithDates, options, siteFees, personFees, peakSeason, exclusiveFees);

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
          const siteFee = calcSiteFee(formDataWithDates, siteFees, peakSeason, exclusiveFees);
          discountAmount = Math.floor(
            (siteFee * coupon.discount_percent) / 100,
          );
          appliedCouponCode = couponCode;

          // used_count をアトミックにインクリメント（同時使用での上限超過を防止）
          const { error: updateErr } = await supabase.rpc("increment_coupon_usage", {
            coupon_id: coupon.id,
          });
          // RPCがない場合のフォールバック（条件付きUPDATE）
          if (updateErr) {
            const { data: updated } = await supabase
              .from("coupons")
              .update({ used_count: coupon.used_count + 1 })
              .eq("id", coupon.id)
              .eq("used_count", coupon.used_count)
              .select("id")
              .single();
            if (!updated) {
              // 別の予約が先にクーポンを使用した → 割引なしで続行
              discountAmount = 0;
              appliedCouponCode = null;
            }
          }
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
        vehicle_plate: body.vehiclePlate.trim(),
        postal_code: postalDigits.slice(0, 3) + "-" + postalDigits.slice(3),
        prefecture: body.prefecture.trim(),
        city: body.city.trim(),
        address_line: body.addressLine.trim(),
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
