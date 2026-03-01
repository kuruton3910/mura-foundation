export type SiteSettings = {
  season_open_month: number; // 1–12
  season_open_day: number; // 1–31
  season_close_month: number;
  season_close_day: number;
  member_close_month: number; // NAKAMA が予約できる最終月
  member_close_day: number;
  booking_window_days: number; // 一般: 何日前から受付
  booking_window_member_days: number; // NAKAMA: 何日前から受付
};

export const DEFAULT_SETTINGS: SiteSettings = {
  season_open_month: 4,
  season_open_day: 25,
  season_close_month: 10,
  season_close_day: 31,
  member_close_month: 11,
  member_close_day: 30,
  booking_window_days: 30,
  booking_window_member_days: 60,
};
