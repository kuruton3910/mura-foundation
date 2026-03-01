"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";

const TERM_GROUPS = [
  {
    id: 1,
    title: "チェックイン・車両・設備について",
    terms: [
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
        id: 17,
        text: "電源サイトでの使用電力は上限1,500Wまでです。超過した場合はブレーカーが落ちます。",
      },
    ],
  },
  {
    id: 2,
    title: "マナー・環境について",
    terms: [
      {
        id: 5,
        text: "22:00以降は静粛にお願いします。他のゲストへのご配慮をお願いします。",
      },
      {
        id: 6,
        text: "ゴミの持ち帰りにご協力ください。場内にゴミ箱はございません。",
      },
      {
        id: 9,
        text: "場内での花火は禁止です。周辺住民への配慮をお願いします。",
      },
      {
        id: 18,
        text: "場内の植物の採取・枝折りは禁止です。自然環境保護にご協力ください。",
      },
      {
        id: 19,
        text: "サイト間の境界を越えた設営・はみ出しはご遠慮ください。隣接サイトへの配慮をお願いします。",
      },
    ],
  },
  {
    id: 3,
    title: "安全・ペットについて",
    terms: [
      {
        id: 7,
        text: "ペットは必ずリードをつけ、他のゲストや動植物に迷惑をかけないようにしてください。",
      },
      {
        id: 8,
        text: "川・池への入水は禁止です。溺水事故防止のため厳守してください。",
      },
      {
        id: 10,
        text: "喫煙は指定の喫煙エリアのみでお願いします。テントやタープ周辺での喫煙は禁止です。",
      },
      {
        id: 15,
        text: "場内での飲酒は適度に。泥酔状態でのトラブルは退場いただく場合があります。",
      },
      {
        id: 16,
        text: "お子様から目を離さないようにしてください。場内の事故はMURA CAMPING GROUNDでは責任を負いかねます。",
      },
    ],
  },
  {
    id: 4,
    title: "責任・キャンセルポリシーについて",
    terms: [
      {
        id: 11,
        text: "施設・設備の破損・汚損は実費にて弁償いただきます。",
      },
      {
        id: 12,
        text: "他のゲストのプライバシーを尊重し、無断での撮影は遠慮してください。",
      },
      {
        id: 13,
        text: "キャンセルポリシー：2日前まで無料、前日50%、当日100%のキャンセル料が発生します。",
      },
      {
        id: 14,
        text: "天候・自然災害による中止の場合は全額返金いたします。",
      },
      {
        id: 20,
        text: "上記の規約に違反した場合、スタッフの判断により退場をお願いすることがあります。この場合の返金はいたしません。",
      },
    ],
  },
];

const TOTAL_GROUPS = TERM_GROUPS.length;

export default function StepTerms({ error }: { error?: string }) {
  const { setValue } = useFormContext<ReservationFormData>();
  const [approvedGroups, setApprovedGroups] = useState<Set<number>>(new Set());
  const [currentGroup, setCurrentGroup] = useState(0); // 0-indexed

  const allApproved = approvedGroups.size === TOTAL_GROUPS;

  useEffect(() => {
    setValue("agreedToTerms", allApproved);
  }, [allApproved, setValue]);

  function handleApprove(groupIndex: number) {
    setApprovedGroups((prev) => {
      const next = new Set(prev);
      next.add(groupIndex);
      return next;
    });
    if (groupIndex + 1 < TOTAL_GROUPS) {
      setCurrentGroup(groupIndex + 1);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <h2 className="text-xl font-bold mb-2 flex items-center border-l-4 border-[#2D4030] pl-3">
          利用規約の確認
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          全4グループ（各5項目）を順番にご確認いただき、各グループへの同意ボタンを押してください。すべてのグループに同意いただくと次のステップに進めます。
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-6">
          {TERM_GROUPS.map((_, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={`h-2 flex-1 rounded-full transition-colors ${
                  approvedGroups.has(i)
                    ? "bg-[#2D4030]"
                    : i === currentGroup
                      ? "bg-[#2D4030]/30"
                      : "bg-stone-200"
                }`}
              />
            </div>
          ))}
          <span className="text-sm font-medium text-stone-600 whitespace-nowrap">
            {approvedGroups.size}/{TOTAL_GROUPS} 完了
          </span>
        </div>

        {/* Term groups */}
        <div className="space-y-4">
          {TERM_GROUPS.map((group, groupIndex) => {
            const isApproved = approvedGroups.has(groupIndex);
            const isActive = groupIndex === currentGroup && !isApproved;
            const isLocked =
              !isApproved &&
              !isActive &&
              groupIndex > (currentGroup === groupIndex ? groupIndex - 1 : currentGroup);

            return (
              <div
                key={group.id}
                className={`rounded-xl border transition-all ${
                  isApproved
                    ? "border-[#2D4030]/30 bg-emerald-50"
                    : isActive
                      ? "border-[#2D4030] bg-white shadow-sm"
                      : "border-stone-200 bg-stone-50 opacity-50"
                }`}
              >
                {/* Group header */}
                <div
                  className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${
                    isApproved ? "bg-emerald-100/60" : isActive ? "bg-stone-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isApproved
                          ? "bg-[#2D4030] text-white"
                          : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {isApproved ? "✓" : groupIndex + 1}
                    </span>
                    <span className="font-semibold text-sm text-stone-800">
                      グループ {groupIndex + 1}：{group.title}
                    </span>
                  </div>
                  {isApproved && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentGroup(groupIndex);
                      }}
                      className="text-xs text-[#2D4030] underline hover:no-underline"
                    >
                      確認
                    </button>
                  )}
                  {!isApproved && !isActive && (
                    <span className="text-xs text-stone-400">未確認</span>
                  )}
                </div>

                {/* Terms list — show when active OR approved (expanded on click) */}
                {(isActive || (isApproved && currentGroup === groupIndex)) && (
                  <div className="px-4 pb-4 space-y-2 mt-2">
                    {group.terms.map((term) => (
                      <div
                        key={term.id}
                        className="flex gap-3 p-3 bg-white rounded-lg border border-stone-100"
                      >
                        <span className="flex-shrink-0 w-5 h-5 bg-[#2D4030]/10 text-[#2D4030] rounded-full flex items-center justify-center text-xs font-bold">
                          {term.id}
                        </span>
                        <p className="text-sm text-stone-700 leading-relaxed">
                          {term.text}
                        </p>
                      </div>
                    ))}

                    {/* Approve button */}
                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => handleApprove(groupIndex)}
                        className="mt-3 w-full py-3 bg-[#2D4030] text-white text-sm font-bold rounded-lg hover:bg-[#2D4030]/90 transition-colors"
                      >
                        上記5項目を理解し、同意します →
                      </button>
                    )}
                    {isApproved && (
                      <div className="mt-2 text-center text-sm text-emerald-700 font-medium">
                        ✓ このグループに同意済み
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsed approved view */}
                {isApproved && currentGroup !== groupIndex && (
                  <div className="px-4 pb-3 text-sm text-emerald-700 font-medium">
                    ✓ 同意済み（全5項目）
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All approved banner */}
        {allApproved && (
          <div className="mt-6 p-4 bg-emerald-100 border-2 border-[#2D4030] rounded-xl text-center">
            <p className="text-[#2D4030] font-bold text-base">
              ✓ 全20項目の利用規約への同意が完了しました
            </p>
            <p className="text-sm text-stone-600 mt-1">
              次のステップへお進みください。
            </p>
          </div>
        )}

        {!allApproved && (
          <p className="mt-4 text-sm text-stone-500 text-center">
            全4グループに同意するまで次のステップに進むことができません。
          </p>
        )}
      </section>
    </div>
  );
}
