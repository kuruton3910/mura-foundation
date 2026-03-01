import type { ReservationFormData } from "./schema";

export const PRICES = {
  adultPerNight: 1500, // 大人/泊
  childPerNight: 500, // 子ども/泊
  petPerNight: 500, // ペット/泊
};

export type SiteFees = {
  weekday: number;
  weekend: number;
};

export const DEFAULT_SITE_FEES: SiteFees = {
  weekday: 2500,
  weekend: 3000,
};

export type RentalOption = {
  id: string;
  name: string;
  description?: string | null;
  price_per_unit: number;
  unit_label: string;
  max_count: number;
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
): number {
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  if (nights === 0) return 0;

  const siteFee = calcSiteFee(data, siteFees);
  const adultFee = data.adults * PRICES.adultPerNight * nights;
  const childFee = data.children * PRICES.childPerNight * nights;
  const petFee = data.pets * PRICES.petPerNight * nights;
  const optFee = calcOptionsFee(data.optionCounts ?? {}, options);

  return siteFee + adultFee + childFee + petFee + optFee;
}

export function calcBreakdown(
  data: ReservationFormData,
  options: RentalOption[] = [],
  siteFees: SiteFees = DEFAULT_SITE_FEES,
): { label: string; amount: number }[] {
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  if (nights === 0) return [];

  const items: { label: string; amount: number }[] = [];

  const siteFee = calcSiteFee(data, siteFees);
  items.push({
    label: `区画料 ${data.vehicleCount}区画 × ${nights}泊`,
    amount: siteFee,
  });
  items.push({
    label: `大人 ${data.adults}名 × ${nights}泊`,
    amount: data.adults * PRICES.adultPerNight * nights,
  });
  if (data.children > 0) {
    items.push({
      label: `子ども ${data.children}名 × ${nights}泊`,
      amount: data.children * PRICES.childPerNight * nights,
    });
  }
  if (data.pets > 0) {
    items.push({
      label: `ペット ${data.pets}匹 × ${nights}泊`,
      amount: data.pets * PRICES.petPerNight * nights,
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
