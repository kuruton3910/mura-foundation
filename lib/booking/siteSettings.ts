export type TermGroup = {
  title: string;
  terms: string[];
};

export type SiteSettings = {
  season_open_month: number; // 1–12
  season_open_day: number; // 1–31
  season_close_month: number;
  season_close_day: number;
  member_close_month: number; // NAKAMA が予約できる最終月
  member_close_day: number;
  booking_window_days: number; // 一般: 何日前から受付
  booking_window_member_days: number; // NAKAMA: 何日前から受付
  site_fee_weekday: number; // 平日区画料（月〜木始まりの夜）
  site_fee_weekend: number; // 週末区画料（金・土始まりの夜）
  terms_groups: TermGroup[];
};

export const DEFAULT_TERM_GROUPS: TermGroup[] = [
  {
    title: "チェックイン・車両・設備について",
    terms: [
      "チェックインは11:00〜17:00、チェックアウトは翌11:00までです。",
      "20:00〜翌5:00の間、ゲート内への車の出入りは禁止されています。緊急の場合はスタッフへご連絡ください。",
      "サイト内でのエンジン音が出る器具（発電機等）の使用は禁止です。",
      "直火は禁止です。焚き火台を使用する場合は地面から十分に離してください。",
      "電源サイトでの使用電力は上限1,500Wまでです。超過した場合はブレーカーが落ちます。",
    ],
  },
  {
    title: "マナー・環境について",
    terms: [
      "22:00以降は静粛にお願いします。他のゲストへのご配慮をお願いします。",
      "ゴミの持ち帰りにご協力ください。場内にゴミ箱はございません。",
      "場内での花火は禁止です。周辺住民への配慮をお願いします。",
      "場内の植物の採取・枝折りは禁止です。自然環境保護にご協力ください。",
      "サイト間の境界を越えた設営・はみ出しはご遠慮ください。",
    ],
  },
  {
    title: "安全・ペットについて",
    terms: [
      "ペットは必ずリードをつけ、他のゲストや動植物に迷惑をかけないようにしてください。",
      "川・池への入水は禁止です。溺水事故防止のため厳守してください。",
      "喫煙は指定の喫煙エリアのみでお願いします。テントやタープ周辺での喫煙は禁止です。",
      "場内での飲酒は適度に。泥酔状態でのトラブルは退場いただく場合があります。",
      "お子様から目を離さないようにしてください。場内の事故はMURA CAMPING GROUNDでは責任を負いかねます。",
    ],
  },
  {
    title: "責任・キャンセルポリシーについて",
    terms: [
      "施設・設備の破損・汚損は実費にて弁償いただきます。",
      "他のゲストのプライバシーを尊重し、無断での撮影は遠慮してください。",
      "キャンセルポリシー：2日前まで無料、前日50%、当日100%のキャンセル料が発生します。",
      "天候・自然災害による中止の場合は全額返金いたします。",
      "上記の規約に違反した場合、スタッフの判断により退場をお願いすることがあります。この場合の返金はいたしません。",
    ],
  },
];

export const DEFAULT_SETTINGS: SiteSettings = {
  season_open_month: 4,
  season_open_day: 25,
  season_close_month: 10,
  season_close_day: 31,
  member_close_month: 11,
  member_close_day: 30,
  booking_window_days: 30,
  booking_window_member_days: 60,
  site_fee_weekday: 2500,
  site_fee_weekend: 3000,
  terms_groups: DEFAULT_TERM_GROUPS,
};
