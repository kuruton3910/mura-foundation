import type { ReservationFormData } from "./schema";

export const PRICES = {
  sitePerNight: 2500, // 1区画/泊
  adultPerNight: 1500, // 大人/泊
  childPerNight: 500, // 子ども/泊
  petPerNight: 500, // ペット/泊
  rentalTent: 3000, // レンタルテント/張
  rentalFirepit: 1500, // 焚き火台/台
};

export function calcNights(
  checkin: Date | null,
  checkout: Date | null,
): number {
  if (!checkin || !checkout) return 0;
  const diff = checkout.getTime() - checkin.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function calcTotal(data: ReservationFormData): number {
  const nights = calcNights(data.checkinDate, data.checkoutDate);
  if (nights === 0) return 0;

  const siteFee = data.vehicleCount * PRICES.sitePerNight * nights;
  const adultFee = data.adults * PRICES.adultPerNight * nights;
  const childFee = data.children * PRICES.childPerNight * nights;
  const petFee = data.pets * PRICES.petPerNight * nights;
  const tentFee = data.rentalTent
    ? data.rentalTentCount * PRICES.rentalTent
    : 0;
  const firepitFee = data.rentalFirepit
    ? data.rentalFirepitCount * PRICES.rentalFirepit
    : 0;

  return siteFee + adultFee + childFee + petFee + tentFee + firepitFee;
}

export function calcBreakdown(data: ReservationFormData) {
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
  if (data.rentalTent && data.rentalTentCount > 0) {
    items.push({
      label: `レンタルテント ${data.rentalTentCount}張`,
      amount: data.rentalTentCount * PRICES.rentalTent,
    });
  }
  if (data.rentalFirepit && data.rentalFirepitCount > 0) {
    items.push({
      label: `焚き火台 ${data.rentalFirepitCount}台`,
      amount: data.rentalFirepitCount * PRICES.rentalFirepit,
    });
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
