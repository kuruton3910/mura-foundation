"use client";

import { useState, useEffect } from "react";

type RentalOption = {
  id?: string;
  name: string;
  description: string;
  price_per_unit: number;
  unit_label: string;
  max_count: number;
  is_active: boolean;
  sort_order: number;
  is_exclusive_only: boolean;
};

const EMPTY_OPTION: RentalOption = {
  name: "",
  description: "",
  price_per_unit: 0,
  unit_label: "個",
  max_count: 5,
  is_active: true,
  sort_order: 0,
  is_exclusive_only: false,
};

export default function OptionsEditor() {
  const [options, setOptions] = useState<RentalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<RentalOption>(EMPTY_OPTION);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchOptions();
  }, []);

  async function fetchOptions() {
    setLoading(true);
    const res = await fetch("/api/admin/options");
    const data = await res.json();
    setOptions(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function startAdd() {
    setForm({ ...EMPTY_OPTION, sort_order: options.length + 1 });
    setEditingIndex(-1); // -1 = new
  }

  function startEdit(index: number) {
    setForm({ ...options[index] });
    setEditingIndex(index);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setForm(EMPTY_OPTION);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "オプション名を入力してください" });
      return;
    }
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/admin/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setMessage({ type: "success", text: "保存しました" });
      setEditingIndex(null);
      setForm(EMPTY_OPTION);
      await fetchOptions();
    } else {
      const err = await res.json();
      setMessage({ type: "error", text: err.error || "保存に失敗しました" });
    }
    setSaving(false);
  }

  async function handleDelete(opt: RentalOption) {
    if (!opt.id) return;
    if (!confirm(`「${opt.name}」を削除しますか？`)) return;

    const res = await fetch("/api/admin/options", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: opt.id }),
    });

    if (res.ok) {
      setMessage({ type: "success", text: "削除しました" });
      await fetchOptions();
    } else {
      setMessage({ type: "error", text: "削除に失敗しました" });
    }
  }

  async function handleToggleActive(opt: RentalOption) {
    if (!opt.id) return;
    await fetch("/api/admin/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...opt, is_active: !opt.is_active }),
    });
    await fetchOptions();
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-stone-400">読み込み中...</div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Option list */}
      <div className="space-y-3">
        {options.length === 0 && (
          <p className="text-stone-400 text-sm text-center py-8">
            オプションがありません。下のボタンから追加してください。
          </p>
        )}
        {options.map((opt, index) => (
          <div
            key={opt.id}
            className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${
              opt.is_active ? "border-stone-200" : "border-stone-100 opacity-50"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-800">{opt.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    opt.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {opt.is_active ? "公開中" : "非公開"}
                </span>
                {opt.is_exclusive_only && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    貸し切り専用
                  </span>
                )}
              </div>
              <div className="text-sm text-stone-500 mt-0.5">
                ¥{opt.price_per_unit.toLocaleString()} / 1{opt.unit_label}{" "}
                ・最大{opt.max_count}
                {opt.unit_label}
                {opt.description && (
                  <span className="ml-2 text-stone-400">{opt.description}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleActive(opt)}
                className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                {opt.is_active ? "非公開にする" : "公開する"}
              </button>
              <button
                type="button"
                onClick={() => startEdit(index)}
                className="text-xs px-3 py-1.5 bg-[#2D4030] text-white rounded-lg hover:bg-[#2D4030]/80 transition-colors"
              >
                編集
              </button>
              <button
                type="button"
                onClick={() => handleDelete(opt)}
                className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      {editingIndex === null && (
        <button
          type="button"
          onClick={startAdd}
          className="w-full py-3 border-2 border-dashed border-stone-300 text-stone-500 rounded-xl hover:border-[#2D4030] hover:text-[#2D4030] transition-colors text-sm font-medium"
        >
          + オプションを追加
        </button>
      )}

      {/* Edit / Add form */}
      {editingIndex !== null && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-stone-800">
            {editingIndex === -1 ? "オプションを追加" : "オプションを編集"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                オプション名 *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例：レンタルテント"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                説明（任意）
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="例：ファミリーテント、前室付き"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                単価（円）
              </label>
              <input
                type="number"
                min={0}
                value={form.price_per_unit}
                onChange={(e) =>
                  setForm({ ...form, price_per_unit: Number(e.target.value) })
                }
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                単位ラベル
              </label>
              <input
                type="text"
                value={form.unit_label}
                onChange={(e) =>
                  setForm({ ...form, unit_label: e.target.value })
                }
                placeholder="例：張、台、個、本"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                最大数量
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.max_count}
                onChange={(e) =>
                  setForm({ ...form, max_count: Number(e.target.value) })
                }
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                並び順
              </label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: Number(e.target.value) })
                }
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="w-4 h-4 accent-[#2D4030]"
              />
              <label htmlFor="is_active" className="text-sm text-stone-700">
                公開する（チェックを外すと予約フォームに表示されません）
              </label>
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_exclusive_only"
                checked={form.is_exclusive_only}
                onChange={(e) =>
                  setForm({ ...form, is_exclusive_only: e.target.checked })
                }
                className="w-4 h-4 accent-purple-600"
              />
              <label htmlFor="is_exclusive_only" className="text-sm text-stone-700">
                貸し切り専用（チェックを入れると貸し切りリクエスト時のみ表示されます）
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-[#2D4030] text-white text-sm font-bold rounded-lg hover:bg-[#2D4030]/80 transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-5 py-2.5 border border-stone-300 text-stone-600 text-sm rounded-lg hover:bg-stone-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
