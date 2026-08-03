"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";
import type { RentalOption } from "@/lib/booking/pricing";

export default function OptionsSelector({ exclusive = false }: { exclusive?: boolean }) {
  const { watch, setValue } = useFormContext<ReservationFormData>();
  const optionCounts = watch("optionCounts") ?? {};
  const [options, setOptions] = useState<RentalOption[]>([]);
  const [loading, setLoading] = useState(true);
  // 拡大表示中の写真（一覧を縦に伸ばさずに大きく見せるためのライトボックス）
  const [zoomed, setZoomed] = useState<RentalOption | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/options?exclusive=${exclusive}`)
      .then((r) => r.json())
      .then((data) => setOptions(Array.isArray(data) ? data : []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [exclusive]);

  function setCount(optionId: string, count: number) {
    setValue("optionCounts", { ...optionCounts, [optionId]: count });
  }

  if (loading) {
    return (
      <div className="text-sm text-stone-400 text-center py-4">
        オプションを読み込み中...
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-stone-400 text-center py-4">
        現在、追加オプションはありません。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const count = optionCounts[opt.id] ?? 0;
        const isSelected = count > 0;
        return (
          <div key={opt.id} className="border rounded-lg overflow-hidden">
            <label className="flex items-center p-4 cursor-pointer hover:bg-stone-50 transition-colors">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => setCount(opt.id, e.target.checked ? 1 : 0)}
                className="w-5 h-5 accent-[#2D4030]"
              />
              {/* 写真URLが設定されているレンタル品はサムネイルを表示 */}
              {opt.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={opt.image_url}
                  alt={opt.name}
                  className="ml-4 h-20 w-20 object-cover rounded-lg border border-stone-200 shrink-0"
                />
              )}
              <div className="ml-4 flex-1 min-w-0">
                <span className="block font-bold">{opt.name}</span>
                <span className="text-sm text-gray-500">
                  ¥{opt.price_per_unit.toLocaleString()} / 1{opt.unit_label}
                  {opt.description && (
                    <span className="ml-2 text-stone-400">{opt.description}</span>
                  )}
                </span>
              </div>

              {/* 詳細（写真を大きく確認できる）。一覧の高さを増やさずに済む */}
              {opt.image_url && (
                <button
                  type="button"
                  onClick={(e) => {
                    // label 内なのでチェックが切り替わらないよう既定動作を止める
                    e.preventDefault();
                    e.stopPropagation();
                    setZoomed(opt);
                  }}
                  className="ml-3 shrink-0 self-center flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#2D4030] border border-[#2D4030]/40 rounded-lg hover:bg-[#2D4030]/5 transition-colors"
                >
                  詳細
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>
              )}
            </label>
            {isSelected && (
              <div className="px-4 pb-4 bg-stone-50 border-t">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg mt-2">
                  <span className="text-sm font-medium text-stone-600">
                    数量（最大{opt.max_count}{opt.unit_label}）
                  </span>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setCount(opt.id, Math.max(1, count - 1))}
                      disabled={count <= 1}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-bold w-6 text-center">{count}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCount(opt.id, Math.min(opt.max_count, count + 1))
                      }
                      disabled={count >= opt.max_count}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 写真の拡大表示 */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomed(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${zoomed.name} の写真`}
        >
          <div
            className="max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomed.image_url ?? ""}
              alt={zoomed.name}
              className="w-full max-h-[70vh] object-contain rounded-lg bg-white"
            />
            <div className="mt-3 bg-white rounded-lg p-4">
              <p className="font-bold text-stone-800">{zoomed.name}</p>
              {zoomed.description && (
                <p className="text-sm text-stone-600 mt-1">
                  {zoomed.description}
                </p>
              )}
              <p className="text-sm text-stone-700 mt-2">
                ¥{zoomed.price_per_unit.toLocaleString()} / 1
                {zoomed.unit_label}
              </p>
              <button
                type="button"
                onClick={() => setZoomed(null)}
                className="mt-3 w-full py-2.5 bg-[#2D4030] text-white text-sm font-bold rounded-lg hover:bg-[#2D4030]/90 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
