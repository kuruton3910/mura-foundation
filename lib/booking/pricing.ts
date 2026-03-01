import type { ReservationFormData } from "./schema";

export const PRICES = {
  sitePerNight: 2500, // 1区画/泊
  adultPerNight: 1500, // 大人/泊
  childPerNight: 500, // 子ども/泊
  petPerNight: 500, // ペット/泊
};

export type RentalOption = {
  id: string;
  name: string;
  description?: string | null;
  price_per_unit: number;
  unit_label: string;
  max_count: number;
};

export function calcNights(
  checkin: Date | null,
  checkout: Date | null,
): number {
  if (!checkin || !checkout) return 0;
  const diff = checkout.getTime() - checkin.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** クーポン割引の対象となる区画料のみを計算 */
export function calcSiteFee(data: ReservationFormData): number {
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  return data.vehicleCount * PRICES.sitePerNight * nights;
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
): number {
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  if (nights === 0) return 0;

  const siteFee = data.vehicleCount * PRICES.sitePerNight * nights;
  const adultFee = data.adults * PRICES.adultPerNight * nights;
  const childFee = data.children * PRICES.childPerNight * nights;
  const petFee = data.pets * PRICES.petPerNight * nights;
  const optFee = calcOptionsFee(data.optionCounts ?? {}, options);

  return siteFee + adultFee + childFee + petFee + optFee;
}

export function calcBreakdown(
  data: ReservationFormData,
  options: RentalOption[] = [],
): { label: string; amount: number }[] {
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  if (nights === 0) return [];

  const items: { label: string; amount: number }[] = [];

  items.push({
    label: `区画料 ${data.vehicleCount}区画 × ${nights}泊`,
    amount: data.vehicleCount * PRICES.sitePerNight * nights,
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
