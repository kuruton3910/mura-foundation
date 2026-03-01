"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";
import {
  DEFAULT_TERM_GROUPS,
  type TermGroup,
} from "@/lib/booking/siteSettings";

const TOTAL_GROUPS_FALLBACK = DEFAULT_TERM_GROUPS.length;

export default function StepTerms({ error }: { error?: string }) {
  const { setValue } = useFormContext<ReservationFormData>();
  const [termGroups, setTermGroups] =
    useState<TermGroup[]>(DEFAULT_TERM_GROUPS);
  const [approvedGroups, setApprovedGroups] = useState<Set<number>>(new Set());
  const [currentGroup, setCurrentGroup] = useState(0);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.terms_groups) && data.terms_groups.length > 0) {
          setTermGroups(data.terms_groups);
        }
      })
      .catch(() => {});
  }, []);

  const totalGroups = termGroups.length;
  const allApproved = approvedGroups.size === totalGroups;

  useEffect(() => {
    setValue("agreedToTerms", allApproved);
  }, [allApproved, setValue]);

  function handleApprove(groupIndex: number) {
    setApprovedGroups((prev) => {
      const next = new Set(prev);
      next.add(groupIndex);
      return next;
    });
    if (groupIndex + 1 < totalGroups) {
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
          全{totalGroups}グループを順番にご確認いただき、各グループへの同意ボタンを押してください。すべてのグループに同意いただくと次のステップに進めます。
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-6">
          {termGroups.map((_, i) => (
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
            {approvedGroups.size}/{totalGroups} 完了
          </span>
        </div>

        {/* Term groups */}
        <div className="space-y-4">
          {termGroups.map((group, groupIndex) => {
            const isApproved = approvedGroups.has(groupIndex);
            const isActive = groupIndex === currentGroup && !isApproved;
            const isLocked =
              !isApproved &&
              !isActive &&
              groupIndex >
                (currentGroup === groupIndex
                  ? groupIndex - 1
                  : currentGroup);

            return (
              <div
                key={groupIndex}
                className={`rounded-xl border transition-all ${
                  isApproved
                    ? "border-[#2D4030]/30 bg-emerald-50"
                    : isActive
                      ? "border-[#2D4030] bg-white shadow-sm"
                      : "border-stone-200 bg-stone-50 opacity-50"
                }`}
              >
                <div
                  className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${
                    isApproved
                      ? "bg-emerald-100/60"
                      : isActive
                        ? "bg-stone-50"
                        : ""
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
                      onClick={() => setCurrentGroup(groupIndex)}
                      className="text-xs text-[#2D4030] underline hover:no-underline"
                    >
                      確認
                    </button>
                  )}
                  {!isApproved && !isActive && (
                    <span className="text-xs text-stone-400">未確認</span>
                  )}
                </div>

                {(isActive || (isApproved && currentGroup === groupIndex)) && (
                  <div className="px-4 pb-4 space-y-2 mt-2">
                    {group.terms.map((term, termIndex) => (
                      <div
                        key={termIndex}
                        className="flex gap-3 p-3 bg-white rounded-lg border border-stone-100"
                      >
                        <span className="flex-shrink-0 w-5 h-5 bg-[#2D4030]/10 text-[#2D4030] rounded-full flex items-center justify-center text-xs font-bold">
                          {termIndex + 1}
                        </span>
                        <p className="text-sm text-stone-700 leading-relaxed">
                          {term}
                        </p>
                      </div>
                    ))}

                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => handleApprove(groupIndex)}
                        className="mt-3 w-full py-3 bg-[#2D4030] text-white text-sm font-bold rounded-lg hover:bg-[#2D4030]/90 transition-colors"
                      >
                        上記{group.terms.length}項目を理解し、同意します →
                      </button>
                    )}
                    {isApproved && (
                      <div className="mt-2 text-center text-sm text-emerald-700 font-medium">
                        ✓ このグループに同意済み
                      </div>
                    )}
                  </div>
                )}

                {isApproved && currentGroup !== groupIndex && (
                  <div className="px-4 pb-3 text-sm text-emerald-700 font-medium">
                    ✓ 同意済み（全{group.terms.length}項目）
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {allApproved && (
          <div className="mt-6 p-4 bg-emerald-100 border-2 border-[#2D4030] rounded-xl text-center">
            <p className="text-[#2D4030] font-bold text-base">
              ✓ 全利用規約への同意が完了しました
            </p>
            <p className="text-sm text-stone-600 mt-1">
              次のステップへお進みください。
            </p>
          </div>
        )}

        {!allApproved && (
          <p className="mt-4 text-sm text-stone-500 text-center">
            全{totalGroups}グループに同意するまで次のステップに進むことができません。
          </p>
        )}
      </section>
    </div>
  );
}
