"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Coupon = {
  id: string;
  code: string;
  discount_percent: number;
  is_member_only: boolean;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
};

const EMPTY_FORM = {
  code: "",
  discount_percent: 10,
  is_member_only: true,
  valid_from: "",
  valid_until: "",
  max_uses: "",
  is_active: true,
};

export default function CouponsEditor({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  function field(key: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code.trim().toUpperCase(),
        discount_percent: Number(form.discount_percent),
        is_member_only: form.is_member_only,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        is_active: form.is_active,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "作成に失敗しました");
    } else {
      setForm(EMPTY_FORM);
      setShowForm(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function toggleActive(coupon: Coupon) {
    await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: coupon.id, is_active: !coupon.is_active }),
    });
    router.refresh();
  }

  async function deleteCoupon(id: string) {
    if (!confirm("このクーポンを削除しますか？")) return;
    setDeleting(id);
    await fetch("/api/admin/coupons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#2D4030] text-white text-sm font-medium rounded-lg hover:bg-[#2D4030]/90 transition-colors"
        >
          {showForm ? "キャンセル" : "+ クーポンを作成"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-stone-200 p-6 space-y-4"
        >
          <h2 className="font-bold text-stone-700 border-l-4 border-[#2D4030] pl-3">
            新規クーポン作成
          </h2>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="クーポンコード（大文字）">
              <input
                type="text"
                value={form.code}
                onChange={field("code")}
                required
                placeholder="NAKAMA10"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </FormField>

            <FormField label="割引率 (%)">
              <input
                type="number"
                value={form.discount_percent}
                onChange={field("discount_percent")}
                min={1}
                max={100}
                required
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </FormField>

            <FormField label="有効開始日">
              <input
                type="date"
                value={form.valid_from}
                onChange={field("valid_from")}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </FormField>

            <FormField label="有効終了日">
              <input
                type="date"
                value={form.valid_until}
                onChange={field("valid_until")}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </FormField>

            <FormField label="最大使用回数（空白=無制限）">
              <input
                type="number"
                value={form.max_uses}
                onChange={field("max_uses")}
                min={1}
                placeholder="無制限"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
              />
            </FormField>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_member_only}
                onChange={field("is_member_only")}
                className="accent-[#2D4030]"
              />
              NAKAMA会員のみ
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={field("is_active")}
                className="accent-[#2D4030]"
              />
              有効
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#2D4030] text-white text-sm font-medium rounded-lg hover:bg-[#2D4030]/90 transition-colors disabled:opacity-50"
            >
              {saving ? "作成中..." : "作成する"}
            </button>
          </div>
        </form>
      )}

      {/* Coupons list */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {coupons.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr className="text-left text-stone-500">
                <th className="px-4 py-3 font-medium">コード</th>
                <th className="px-4 py-3 font-medium">割引</th>
                <th className="px-4 py-3 font-medium">有効期間</th>
                <th className="px-4 py-3 font-medium">使用回数</th>
                <th className="px-4 py-3 font-medium text-center">会員限定</th>
                <th className="px-4 py-3 font-medium text-center">
                  ステータス
                </th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono font-bold text-stone-800">
                    {c.code}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {c.discount_percent}%
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {c.valid_from ?? "—"} 〜 {c.valid_until ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {c.used_count} / {c.max_uses ?? "∞"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.is_member_only ? "✓" : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        c.is_active
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                      }`}
                    >
                      {c.is_active ? "有効" : "無効"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteCoupon(c.id)}
                      disabled={deleting === c.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-stone-400">
            <p>クーポンがありません。</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
