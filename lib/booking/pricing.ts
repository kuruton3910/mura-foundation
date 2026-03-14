import type { ReservationFormData } from "./schema";

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

/** 金曜・土曜始まりの夜はウィークエンド料金 */
export function isWeekendNight(d: Date): boolean {
  const dow = d.getDay(); // 0=Sun, 5=Fri, 6=Sat
  return dow === 5 || dow === 6;
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
 * 子どもとペットは合算して 2 人で大人 1 名とカウント
 * 例: 大人2 + 子ども1 + ペット1 → 2 + ceil(2/2) = 3
 */
export function calcAdultEquivalents(
  adults: number,
  children: number,
  pets: number,
): number {
  return adults + Math.ceil((children + pets) / 2);
}

/** クーポン割引の対象となる区画料のみを計算 */
export function calcSiteFee(
  data: ReservationFormData,
  siteFees: SiteFees = DEFAULT_SITE_FEES,
): number {
  if (!data.checkinDate || !data.checkoutDate) return 0;
  let total = 0;
  const cur = new Date(data.checkinDate);
  while (cur < data.checkoutDate) {
    const fee = isWeekendNight(cur) ? siteFees.weekend : siteFees.weekday;
    total += data.vehicleCount * fee;
    cur.setDate(cur.getDate() + 1);
  }
  return total;
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
  return extra * personFees.extraPersonFeePerNight * nights;
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

export function calcBreakdown(
  data: ReservationFormData,
  options: RentalOption[] = [],
  siteFees: SiteFees = DEFAULT_SITE_FEES,
  personFees: PersonFees = DEFAULT_PERSON_FEES,
): { label: string; amount: number }[] {
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  if (nights === 0) return [];

  const items: { label: string; amount: number }[] = [];
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
    items.push({
      label: `追加人数 ${extra}名分 × ${nights}泊`,
      amount: extra * personFees.extraPersonFeePerNight * nights,
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
