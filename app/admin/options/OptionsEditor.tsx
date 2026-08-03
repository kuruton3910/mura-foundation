"use client";

import { useState, useEffect, useRef } from "react";

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
  image_url: string;
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
  image_url: "",
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

  // 編集フォームは一覧の下に出るため、開いたら自動でスクロールする
  const formRef = useRef<HTMLDivElement | null>(null);
  // 画像アップロード
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 同じファイルを続けて選べるように input の値をリセットしておく
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/options/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        setUploadError(json?.error ?? "アップロードに失敗しました");
        return;
      }
      setForm((prev) => ({ ...prev, image_url: json.url }));
    } catch {
      setUploadError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (editingIndex !== null) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingIndex]);

  async function fetchOptions() {
    setLoading(true);
    const res = await fetch("/api/admin/options");
    const data = await res.json();
    // DB が null を返す場合があるので入力欄用に空文字へ正規化する
    setOptions(
      Array.isArray(data)
        ? data.map((o: RentalOption) => ({ ...o, image_url: o.image_url ?? "" }))
        : [],
    );
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
            {opt.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={opt.image_url}
                alt={opt.name}
                className="h-14 w-14 object-cover rounded-lg border border-stone-200 shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg border border-dashed border-stone-300 shrink-0 flex items-center justify-center text-[10px] text-stone-400 text-center leading-tight">
                写真
                <br />
                なし
              </div>
            )}
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
            {/* アクションボタン: モバイルで折り返し可能 */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
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
        <div
          ref={formRef}
          className="bg-stone-50 border-2 border-[#2D4030] rounded-xl p-6 space-y-4 scroll-mt-4"
        >
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

            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                写真（任意）
              </label>

              <div className="flex items-start gap-4">
                {/* プレビュー */}
                {form.image_url.trim() !== "" ? (
                  <div className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.image_url}
                      alt="プレビュー"
                      className="h-28 w-28 object-cover rounded-lg border border-stone-200"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: "" })}
                      title="写真を外す"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-stone-300 text-stone-500 text-xs shadow hover:bg-stone-100"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="h-28 w-28 shrink-0 rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center text-xs text-stone-400">
                    写真なし
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* ファイル選択（パソコン・スマホの写真から直接アップロード）*/}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-[#2D4030] text-white text-sm font-bold rounded-lg hover:bg-[#2D4030]/80 transition-colors disabled:opacity-50"
                  >
                    {uploading ? "アップロード中..." : "画像を選ぶ"}
                  </button>
                  <p className="text-xs text-stone-400 mt-1.5">
                    パソコン・スマホの写真をそのまま選べます（JPEG/PNG/WebP/GIF・5MBまで）。
                  </p>
                  {uploadError && (
                    <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                  )}

                  {/* URL直接入力（既存サイトの画像を使いたい場合のフォールバック）*/}
                  <details className="mt-3">
                    <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-700">
                      画像URLを直接入力する
                    </summary>
                    <input
                      type="url"
                      value={form.image_url}
                      onChange={(e) =>
                        setForm({ ...form, image_url: e.target.value })
                      }
                      placeholder="https://example.com/photo.jpg"
                      className="mt-2 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4030]/40"
                    />
                  </details>
                </div>
              </div>
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
                貸し切り限定（OFF＝通常・貸切の両方で表示 / ON＝貸切予約時のみ表示）
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
