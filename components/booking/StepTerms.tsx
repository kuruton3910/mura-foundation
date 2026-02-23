"use client";

import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";

const TERMS = [
  {
    id: 1,
    text: "チェックインは11:00〜17:00、チェックアウトは翌11:00までです。",
  },
  {
    id: 2,
    text: "20:00〜翌5:00の間、ゲート内への車の出入りは禁止されています。緊急の場合はスタッフへご連絡ください。",
  },
  {
    id: 3,
    text: "サイト内でのエンジン音が出る器具（発電機等）の使用は禁止です。",
  },
  {
    id: 4,
    text: "直火は禁止です。焚き火台を使用する場合は地面から十分に離してください。",
  },
  {
    id: 5,
    text: "22:00以降は静粛にお願いします。他のゲストへのご配慮をお願いします。",
  },
  {
    id: 6,
    text: "ゴミの持ち帰りにご協力ください。場内にゴミ箱はございません。",
  },
  {
    id: 7,
    text: "ペットは必ずリードをつけ、他のゲストや動植物に迷惑をかけないようにしてください。",
  },
  {
    id: 8,
    text: "川・池への入水は禁止です。溺水事故防止のため厳守してください。",
  },
  { id: 9, text: "場内での花火は禁止です。周辺住民への配慮をお願いします。" },
  {
    id: 10,
    text: "喫煙は指定の喫煙エリアのみでお願いします。テントやタープ周辺での喫煙は禁止です。",
  },
  { id: 11, text: "施設・設備の破損・汚損は実費にて弁償いただきます。" },
  {
    id: 12,
    text: "他のゲストのプライバシーを尊重し、無断での撮影は遠慮してください。",
  },
  {
    id: 13,
    text: "キャンセルポリシー：2日前まで無料、前日50%、当日100%のキャンセル料が発生します。",
  },
  { id: 14, text: "天候・自然災害による中止の場合は全額返金いたします。" },
  {
    id: 15,
    text: "場内での飲酒は適度に。泥酔状態でのトラブルは退場いただく場合があります。",
  },
  {
    id: 16,
    text: "お子様から目を離さないようにしてください。場内の事故はMURA CAMPING GROUNDでは責任を負いかねます。",
  },
  {
    id: 17,
    text: "電源サイトでの使用電力は上限1,500Wまでです。超過した場合はブレーカーが落ちます。",
  },
  {
    id: 18,
    text: "場内の植物の採取・枝折りは禁止です。自然環境保護にご協力ください。",
  },
  {
    id: 19,
    text: "サイト間の境界を越えた設営・はみ出しはご遠慮ください。隣接サイトへの配慮をお願いします。",
  },
  {
    id: 20,
    text: "上記の規約に違反した場合、スタッフの判断により退場をお願いすることがあります。この場合の返金はいたしません。",
  },
];

export default function StepTerms({ error }: { error?: string }) {
  const { watch, setValue } = useFormContext<ReservationFormData>();
  const agreed = watch("agreedToTerms");

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <h2 className="text-xl font-bold mb-6 flex items-center border-l-4 border-[#2D4030] pl-3">
          利用規約の確認
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          予約を確定する前に、以下の利用規約（全20項目）をご確認の上、同意チェックをお願いします。
        </p>

        <div className="space-y-3 mb-8">
          {TERMS.map((term) => (
            <div
              key={term.id}
              className="flex gap-3 p-4 bg-stone-50 rounded-lg border border-stone-100"
            >
              <span className="flex-shrink-0 w-6 h-6 bg-[#2D4030]/10 text-[#2D4030] rounded-full flex items-center justify-center text-xs font-bold">
                {term.id}
              </span>
              <p className="text-sm text-stone-700 leading-relaxed">
                {term.text}
              </p>
            </div>
          ))}
        </div>

        {/* Agree checkbox */}
        <label className="flex items-start gap-3 cursor-pointer p-5 border-2 border-[#2D4030] rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setValue("agreedToTerms", e.target.checked)}
            className="w-5 h-5 mt-0.5 accent-[#2D4030] flex-shrink-0"
          />
          <div>
            <span className="font-bold text-[#2D4030] block">
              上記の利用規約（全20項目）に同意します
            </span>
            <span className="text-sm text-stone-600 mt-1 block">
              同意いただけない場合は予約を進めることができません。
            </span>
          </div>
        </label>
      </section>
    </div>
  );
}
