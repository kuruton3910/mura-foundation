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
              <div className="ml-4 flex-1">
                <span className="block font-bold">{opt.name}</span>
                <span className="text-sm text-gray-500">
                  ¥{opt.price_per_unit.toLocaleString()} / 1{opt.unit_label}
                  {opt.description && (
                    <span className="ml-2 text-stone-400">{opt.description}</span>
                  )}
                </span>
              </div>
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
    </div>
  );
}
