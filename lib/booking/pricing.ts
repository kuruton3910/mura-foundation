import type { ReservationFormData } from "./schema";
import * as holiday_jp from "@holiday-jp/holiday_jp";

export type SiteFees = {
  weekday: number;
  weekend: number;
};

export const DEFAULT_SITE_FEES: SiteFees = {
  weekday: 2500,
  weekend: 3000,
};

export type PersonFees = {
  /** 区画料に含まれる人数（大人換算）。この人数まで追加料金なし */
  includedPersonsPerSite: number;
  /** 含まれる人数を超えた場合の追加料金（大人1名換算/泊） */
  extraPersonFeePerNight: number;
};

export const DEFAULT_PERSON_FEES: PersonFees = {
  includedPersonsPerSite: 3,
  extraPersonFeePerNight: 1500,
};

export type RentalOption = {
  id: string;
  name: string;
  description?: string | null;
  price_per_unit: number;
  unit_label: string;
  max_count: number;
  is_exclusive_only?: boolean;
};

/** 週末料金扱いの夜か判定：金・土・日・祝日（ローカルTZ基準、カレンダー表示用） */
export function isWeekendNight(d: Date): boolean {
  const dow = d.getDay(); // ローカルTZ: 0=Sun, 5=Fri, 6=Sat
  if (dow === 0 || dow === 5 || dow === 6) return true;
  return holiday_jp.isHoliday(d);
}

/** 週末料金扱いの夜か判定：金・土・日・祝日（YYYY-MM-DD文字列基準、サーバー計算用） */
export function isWeekendNightUTC(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateUTC = new Date(Date.UTC(y, m - 1, d));
  const dow = dateUTC.getUTCDay();
  if (dow === 0 || dow === 5 || dow === 6) return true;
  // 祝日判定はローカルTZのDateで（holiday_jpはローカル時刻メソッドを使用）
  return holiday_jp.isHoliday(new Date(y, m - 1, d));
}

export function calcNights(
  checkin: Date | null,
  checkout: Date | null,
): number {
  if (!checkin || !checkout) return 0;
  const diff = checkout.getTime() - checkin.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * 大人換算人数を計算する
 * 子どもとペットは合算して 2 人で大人 1 名とカウント（端数は0.5として保持）
 * 例: 大人3 + 子ども1 → 3 + 0.5 = 3.5（追加0.5人分 = ¥750）
 */
export function calcAdultEquivalents(
  adults: number,
  children: number,
  pets: number,
): number {
  return adults + (children + pets) / 2;
}

/** クーポン割引の対象となる区画料のみを計算 */
export function calcSiteFee(
  data: ReservationFormData,
  siteFees: SiteFees = DEFAULT_SITE_FEES,
): number {
  if (!data.checkinDate || !data.checkoutDate) return 0;

  // YYYY-MM-DD文字列ベースで日付ループ（タイムゾーンずれ完全防止）
  const checkinStr = toDateStr(data.checkinDate);
  const checkoutStr = toDateStr(data.checkoutDate);

  let total = 0;
  let curStr = checkinStr;
  while (curStr < checkoutStr) {
    const fee = isWeekendNightUTC(curStr) ? siteFees.weekend : siteFees.weekday;
    total += data.vehicleCount * fee;
    // 次の日へ
    const [y, m, d] = curStr.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    curStr = next.toISOString().split("T")[0];
  }
  return total;
}

/** Date → YYYY-MM-DD文字列（ローカルTZ基準） */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 区画料に含まれる人数を超えた分の追加料金を計算する
 * 各区画に includedPersonsPerSite 名まで含まれる
 */
export function calcExtraPersonFee(
  data: ReservationFormData,
  personFees: PersonFees = DEFAULT_PERSON_FEES,
): number {
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  if (nights === 0) return 0;
  const equiv = calcAdultEquivalents(data.adults, data.children, data.pets);
  const included = data.vehicleCount * personFees.includedPersonsPerSite;
  const extra = Math.max(0, equiv - included);
  return Math.floor(extra * personFees.extraPersonFeePerNight * nights);
}

export function calcOptionsFee(
  optionCounts: Record<string, number>,
  options: RentalOption[],
): number {
  return options.reduce((sum, opt) => {
    const count = optionCounts[opt.id] ?? 0;
    return sum + count * opt.price_per_unit;
  }, 0);
}

export function calcTotal(
  data: ReservationFormData,
  options: RentalOption[] = [],
  siteFees: SiteFees = DEFAULT_SITE_FEES,
  personFees: PersonFees = DEFAULT_PERSON_FEES,
): number {
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  if (nights === 0) return 0;

  const siteFee = calcSiteFee(data, siteFees);
  const extraPersonFee = calcExtraPersonFee(data, personFees);
  const optFee = calcOptionsFee(data.optionCounts ?? {}, options);

  return siteFee + extraPersonFee + optFee;
}

export type BreakdownItem = {
  label: string;
  amount: number;
  /** 補助行（インデント表示用） */
  detail?: string[];
};

export function calcBreakdown(
  data: ReservationFormData,
  options: RentalOption[] = [],
  siteFees: SiteFees = DEFAULT_SITE_FEES,
  personFees: PersonFees = DEFAULT_PERSON_FEES,
): BreakdownItem[] {
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  if (nights === 0) return [];

  const items: BreakdownItem[] = [];
  const included = personFees.includedPersonsPerSite;

  const siteFee = calcSiteFee(data, siteFees);
  items.push({
    label: `区画料 ${data.vehicleCount}区画 × ${nights}泊（大人${included}名まで含む）`,
    amount: siteFee,
  });

  const equiv = calcAdultEquivalents(data.adults, data.children, data.pets);
  const totalIncluded = data.vehicleCount * included;
  const extra = Math.max(0, equiv - totalIncluded);
  if (extra > 0) {
    // 追加人数の根拠を可視化
    const detail: string[] = [];
    detail.push(`大人 ${data.adults}名`);
    if (data.children > 0) {
      detail.push(`子ども ${data.children}名（${data.children / 2}名換算）`);
    }
    if (data.pets > 0) {
      detail.push(`ペット ${data.pets}匹（${data.pets / 2}名換算）`);
    }
    detail.push(`合計 ${equiv}名 − 含 ${totalIncluded}名 = 追加 ${extra}名`);
    detail.push(`@¥${personFees.extraPersonFeePerNight.toLocaleString()}/名/泊 × ${nights}泊`);

    items.push({
      label: `追加人数 ${extra}名分 × ${nights}泊`,
      amount: Math.floor(extra * personFees.extraPersonFeePerNight * nights),
      detail,
    });
  }

  for (const opt of options) {
    const count = (data.optionCounts ?? {})[opt.id] ?? 0;
    if (count > 0) {
      items.push({
        label: `${opt.name} ${count}${opt.unit_label}`,
        amount: count * opt.price_per_unit,
      });
    }
  }

  return items;
}

export function formatDate(date: Date | null): string {
  if (!date) return "未選択";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dow = days[date.getDay()];
  return `${y}年${m}月${d}日(${dow})`;
}
