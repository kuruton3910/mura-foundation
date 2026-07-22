import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReservationActions from "./ReservationActions";
import {
  calcBreakdown,
  type RentalOption,
  type SiteFees,
  type PersonFees,
  type PeakSeason,
  type ExclusiveFees,
} from "@/lib/booking/pricing";
import { DEFAULT_SETTINGS } from "@/lib/booking/siteSettings";
import type { ReservationFormData } from "@/lib/booking/schema";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "確定", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "未決済", cls: "bg-amber-100 text-amber-700" },
  cancelled: { label: "キャンセル", cls: "bg-red-100 text-red-700" },
  refunded: { label: "返金済", cls: "bg-stone-100 text-stone-600" },
};

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: reservation } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .single();

  if (!reservation) notFound();

  const st = STATUS_LABELS[reservation.status] ?? {
    label: reservation.status,
    cls: "bg-stone-100 text-stone-600",
  };

  const nights = Math.round(
    (new Date(reservation.checkout_date).getTime() -
      new Date(reservation.checkin_date).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // ── 金額の内訳を再計算（保存済みの予約データ + サイト設定から）──
  const { data: settingsRow } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();
  const s = { ...DEFAULT_SETTINGS, ...(settingsRow ?? {}) };

  const siteFees: SiteFees = {
    weekday: s.site_fee_weekday,
    weekend: s.site_fee_weekend,
  };
  const personFees: PersonFees = {
    includedPersonsPerSite: s.included_persons_per_site,
    extraPersonFeePerNight: s.extra_person_fee_per_night,
  };
  const peakSeason: PeakSeason = {
    startMonth: s.peak_season_start_month,
    startDay: s.peak_season_start_day,
    endMonth: s.peak_season_end_month,
    endDay: s.peak_season_end_day,
  };
  const exclusiveFees: ExclusiveFees = {
    weekday: s.exclusive_fee_weekday,
    weekend: s.exclusive_fee_weekend,
    maxPersons: s.exclusive_max_persons,
  };

  // selected_options（jsonb）から options 配列と optionCounts を復元
  type StoredOption = {
    id: string;
    name: string;
    count: number;
    unit_label: string;
    price_per_unit: number;
  };
  const storedOptions: StoredOption[] = Array.isArray(reservation.selected_options)
    ? reservation.selected_options
    : [];
  const optionCounts: Record<string, number> = {};
  const optionsForCalc: RentalOption[] = storedOptions.map((o) => {
    optionCounts[o.id] = o.count;
    return {
      id: o.id,
      name: o.name,
      price_per_unit: o.price_per_unit,
      unit_label: o.unit_label,
      max_count: 99,
    };
  });

  const [cy, cm, cd] = reservation.checkin_date.split("-").map(Number);
  const [oy, om, od] = reservation.checkout_date.split("-").map(Number);
  const breakdownData = {
    checkinDate: new Date(cy, cm - 1, cd),
    checkoutDate: new Date(oy, om - 1, od),
    vehicleCount: reservation.vehicle_count,
    adults: reservation.adults,
    children: reservation.children,
    pets: reservation.pets,
    isExclusive: reservation.is_exclusive,
    optionCounts,
  } as ReservationFormData;

  const breakdown = calcBreakdown(
    breakdownData,
    optionsForCalc,
    siteFees,
    personFees,
    peakSeason,
    exclusiveFees,
  );
  const discountAmount = reservation.discount_amount ?? 0;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/reservations"
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← 予約一覧
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">予約詳細</h1>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${st.cls}`}
        >
          {st.label}
        </span>
      </div>

      {/* 各セクション間の余白を統一 */}
      <div className="space-y-6">
        {/* Guest info */}
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-700 mb-4 border-l-4 border-[#2D4030] pl-3">
            予約者情報
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <InfoRow label="氏名" value={reservation.guest_name} />
            <InfoRow label="メール" value={reservation.guest_email} />
            <InfoRow label="電話" value={reservation.guest_phone} />
            <InfoRow
              label="会員"
              value={reservation.is_member ? "NAKAMA会員" : "一般"}
            />
            <InfoRow
              label="車のナンバー"
              value={reservation.vehicle_plate || "未入力"}
            />
            <InfoRow
              label="郵便番号"
              value={reservation.postal_code || "未入力"}
            />
            <InfoRow
              label="ご住所"
              value={
                (reservation.prefecture || reservation.city || reservation.address_line)
                  ? `${reservation.prefecture ?? ""}${reservation.city ?? ""}${reservation.address_line ?? ""}`
                  : "未入力"
              }
            />
          </dl>
          {reservation.notes && (
            <div className="mt-4 p-3 bg-stone-50 rounded-lg text-sm text-stone-600">
              <span className="font-medium">備考：</span> {reservation.notes}
            </div>
          )}
        </section>

        {/* Reservation details */}
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-700 mb-4 border-l-4 border-[#2D4030] pl-3">
            予約内容
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <InfoRow label="チェックイン" value={reservation.checkin_date} />
            <InfoRow label="チェックアウト" value={reservation.checkout_date} />
            <InfoRow label="泊数" value={`${nights}泊`} />
            <InfoRow
              label="区画数"
              value={`${reservation.vehicle_count}区画`}
            />
            <InfoRow
              label="人数"
              value={`大人${reservation.adults}名 / 子供${reservation.children}名 / ペット${reservation.pets}匹`}
            />
            <InfoRow
              label="レンタルテント"
              value={
                reservation.rental_tent
                  ? `あり (${reservation.rental_tent_count}張)`
                  : "なし"
              }
            />
            <InfoRow
              label="レンタル焚き火台"
              value={
                reservation.rental_firepit
                  ? `あり (${reservation.rental_firepit_count}台)`
                  : "なし"
              }
            />
          </dl>
        </section>

        {/* Payment info */}
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-700 mb-4 border-l-4 border-[#2D4030] pl-3">
            決済情報
          </h2>
          {/* 金額内訳 */}
          {breakdown.length > 0 && (
            <div className="mb-4 rounded-lg border border-stone-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-stone-100">
                  {breakdown.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-stone-600">{item.label}</td>
                      <td className="px-4 py-2 text-right font-medium text-stone-800 whitespace-nowrap">
                        ¥{item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {discountAmount > 0 && (
                    <tr className="text-emerald-700">
                      <td className="px-4 py-2">
                        クーポン割引
                        {reservation.coupon_code ? `（${reservation.coupon_code}）` : ""}
                      </td>
                      <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                        -¥{discountAmount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-stone-50">
                    <td className="px-4 py-2 font-bold text-stone-800">合計（税込）</td>
                    <td className="px-4 py-2 text-right font-bold text-[#2D4030] whitespace-nowrap">
                      ¥{reservation.total_amount?.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <InfoRow
              label="合計金額"
              value={`¥${reservation.total_amount?.toLocaleString()}`}
            />
            {/* Stripe IDは長いため truncate で省略表示し、hover で全文確認可能にする */}
            {reservation.stripe_session_id && (
              <>
                <dt className="text-stone-500">Stripe Session ID</dt>
                <dd
                  className="font-medium text-stone-800 truncate max-w-55"
                  title={reservation.stripe_session_id}
                >
                  {reservation.stripe_session_id}
                </dd>
              </>
            )}
            {reservation.terms_agreed_at && (
              <InfoRow
                label="規約同意日時"
                value={new Date(reservation.terms_agreed_at).toLocaleString(
                  "ja-JP",
                )}
              />
            )}
            <InfoRow
              label="予約作成日時"
              value={new Date(reservation.created_at).toLocaleString("ja-JP")}
            />
          </dl>
        </section>

        {/* Actions */}
        <ReservationActions
          reservationId={reservation.id}
          currentStatus={reservation.status}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-800">{value}</dd>
    </>
  );
}
