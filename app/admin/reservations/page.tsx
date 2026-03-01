import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "確定", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "未決済", cls: "bg-amber-100 text-amber-700" },
  cancelled: { label: "キャンセル", cls: "bg-red-100 text-red-700" },
  refunded: { label: "返金済", cls: "bg-stone-100 text-stone-600" },
};

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status;
  const searchQuery = params.q?.trim();

  const supabase = createServerClient();

  let query = supabase
    .from("reservations")
    .select(
      "id, guest_name, guest_email, guest_phone, checkin_date, checkout_date, vehicle_count, adults, children, total_amount, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: reservations } = await query.limit(100);

  const filtered = searchQuery
    ? reservations?.filter(
        (r) =>
          r.guest_name.includes(searchQuery) ||
          r.guest_email.includes(searchQuery) ||
          r.guest_phone.includes(searchQuery),
      )
    : reservations;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">予約一覧</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {["all", "confirmed", "pending", "cancelled", "refunded"].map((s) => (
          <Link
            key={s}
            href={`/admin/reservations?status=${s}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (statusFilter ?? "all") === s
                ? "bg-[#2D4030] text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {s === "all" ? "すべて" : (STATUS_LABELS[s]?.label ?? s)}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {filtered && filtered.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr className="text-left text-stone-500">
                <th className="px-4 py-3 font-medium">予約者</th>
                <th className="px-4 py-3 font-medium">チェックイン</th>
                <th className="px-4 py-3 font-medium">チェックアウト</th>
                <th className="px-4 py-3 font-medium">区画/人数</th>
                <th className="px-4 py-3 font-medium text-right">金額</th>
                <th className="px-4 py-3 font-medium text-center">
                  ステータス
                </th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((r) => {
                const st = STATUS_LABELS[r.status] ?? {
                  label: r.status,
                  cls: "bg-stone-100 text-stone-600",
                };
                return (
                  <tr key={r.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">
                        {r.guest_name}
                      </p>
                      <p className="text-xs text-stone-400">{r.guest_email}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.checkin_date}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.checkout_date}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.vehicle_count}区画 / 大人{r.adults}
                      {r.children > 0 ? `・子${r.children}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-800">
                      ¥{r.total_amount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/reservations/${r.id}`}
                        className="text-xs text-[#2D4030] font-medium hover:underline"
                      >
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-stone-400">
            <p>予約が見つかりません。</p>
          </div>
        )}
      </div>
    </div>
  );
}
