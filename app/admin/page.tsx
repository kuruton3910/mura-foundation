import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // Today's check-ins
  const { data: todayCheckins } = await supabase
    .from("reservations")
    .select("id, guest_name, vehicle_count, adults, children")
    .eq("checkin_date", today)
    .eq("status", "confirmed");

  // Upcoming confirmed reservations (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  const { data: upcoming } = await supabase
    .from("reservations")
    .select(
      "id, guest_name, checkin_date, checkout_date, total_amount, status, vehicle_count",
    )
    .eq("status", "confirmed")
    .gte("checkin_date", today)
    .lte("checkin_date", nextWeekStr)
    .order("checkin_date");

  // This month's revenue
  const monthStart = today.slice(0, 7) + "-01";
  const { data: monthRevenue } = await supabase
    .from("reservations")
    .select("total_amount")
    .eq("status", "confirmed")
    .gte("checkin_date", monthStart);

  const totalRevenue =
    monthRevenue?.reduce((s, r) => s + (r.total_amount ?? 0), 0) ?? 0;

  // Pending reservations count
  const { count: pendingCount } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const statusLabel: Record<string, string> = {
    confirmed: "確定",
    pending: "未決済",
    cancelled: "キャンセル",
    refunded: "返金済",
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">ダッシュボード</h1>

      {/* 統計カード: モバイルで1列、sm以上で2列、xl以上で4列 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="本日チェックイン"
          value={`${todayCheckins?.length ?? 0} 件`}
          sub={today}
          color="bg-emerald-50 border-emerald-200"
        />
        <StatCard
          label="今月の売上"
          value={`¥${totalRevenue.toLocaleString()}`}
          sub={today.slice(0, 7)}
          color="bg-blue-50 border-blue-200"
        />
        <StatCard
          label="7日以内の予約"
          value={`${upcoming?.length ?? 0} 件`}
          sub="確定済み"
          color="bg-amber-50 border-amber-200"
        />
        <StatCard
          label="決済待ち"
          value={`${pendingCount ?? 0} 件`}
          sub="未決済"
          color="bg-red-50 border-red-200"
        />
      </div>

      {/* Today's check-ins */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
        <h2 className="font-bold text-stone-700 mb-4">
          本日のチェックイン ({todayCheckins?.length ?? 0}件)
        </h2>
        {todayCheckins && todayCheckins.length > 0 ? (
          <div className="space-y-2">
            {todayCheckins.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0"
              >
                <span className="font-medium text-stone-800">
                  {r.guest_name}
                </span>
                <span className="text-sm text-stone-500">
                  {r.vehicle_count}区画 / 大人{r.adults}名
                  {r.children > 0 && ` / 子供${r.children}名`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-400 text-sm">
            本日のチェックインはありません。
          </p>
        )}
      </section>

      {/* Upcoming reservations */}
      <section className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="font-bold text-stone-700 mb-4">直近7日以内の予約</h2>
        {upcoming && upcoming.length > 0 ? (
          <>
            {/* デスクトップ: テーブル表示（横スクロール対応） */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm min-w-135">
                <thead>
                  <tr className="text-left text-stone-500 border-b border-stone-100">
                    <th className="pb-2 font-medium">氏名</th>
                    <th className="pb-2 font-medium">チェックイン</th>
                    <th className="pb-2 font-medium">チェックアウト</th>
                    <th className="pb-2 font-medium">区画</th>
                    <th className="pb-2 font-medium text-right">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((r) => (
                    <tr key={r.id} className="border-b border-stone-50">
                      <td className="py-2 font-medium text-stone-800">
                        {r.guest_name}
                      </td>
                      <td className="py-2 text-stone-600">{r.checkin_date}</td>
                      <td className="py-2 text-stone-600">{r.checkout_date}</td>
                      <td className="py-2 text-stone-600">{r.vehicle_count}区画</td>
                      <td className="py-2 text-right font-medium">
                        ¥{r.total_amount?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* モバイル: カード形式で表示 */}
            <div className="sm:hidden space-y-3">
              {upcoming.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-stone-100 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-800">
                      {r.guest_name}
                    </span>
                    <span className="font-medium text-stone-800">
                      ¥{r.total_amount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500">
                    {r.checkin_date} → {r.checkout_date}　/　{r.vehicle_count}区画
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-stone-400 text-sm">直近の予約はありません。</p>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <p className="text-xs font-medium text-stone-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-stone-800">{value}</p>
      <p className="text-xs text-stone-400 mt-1">{sub}</p>
    </div>
  );
}
