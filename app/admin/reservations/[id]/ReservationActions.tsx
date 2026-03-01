"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReservationActions({
  reservationId,
  currentStatus,
}: {
  reservationId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(newStatus: string) {
    if (
      !confirm(
        `ステータスを「${newStatus === "cancelled" ? "キャンセル" : newStatus}」に変更しますか？`,
      )
    )
      return;

    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "更新に失敗しました");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  if (currentStatus === "cancelled" || currentStatus === "refunded") {
    return null;
  }

  return (
    <section className="bg-white rounded-xl border border-stone-200 p-6">
      <h2 className="font-bold text-stone-700 mb-4 border-l-4 border-[#2D4030] pl-3">
        操作
      </h2>
      {error && (
        <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-3 flex-wrap">
        {currentStatus === "pending" && (
          <button
            onClick={() => updateStatus("confirmed")}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            確定済みにする
          </button>
        )}
        {currentStatus === "confirmed" && (
          <button
            onClick={() => updateStatus("cancelled")}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            キャンセルする
          </button>
        )}
      </div>
    </section>
  );
}
