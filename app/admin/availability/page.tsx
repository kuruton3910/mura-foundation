import { createServerClient } from "@/lib/supabase/server";
import AvailabilityEditor from "./AvailabilityEditor";

export const dynamic = "force-dynamic";

export default async function AdminAvailabilityPage() {
  const supabase = createServerClient();

  // Get next 3 months of overrides
  const today = new Date();
  const fromStr = today.toISOString().split("T")[0];
  const threeMonths = new Date(today);
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  const toStr = threeMonths.toISOString().split("T")[0];

  const { data: overrides } = await supabase
    .from("availability_overrides")
    .select("*")
    .gte("date", fromStr)
    .lte("date", toStr)
    .order("date");

  // Get current reservations count per date
  const { data: reservations } = await supabase
    .from("reservations")
    .select("checkin_date, checkout_date, vehicle_count")
    .eq("status", "confirmed")
    .gte("checkin_date", fromStr)
    .lte("checkin_date", toStr);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">空き状況管理</h1>
      <p className="text-sm text-stone-500 mb-6">
        デフォルト: 1日5区画。休業日設定や区画数の一時変更ができます。
      </p>
      <AvailabilityEditor
        overrides={overrides ?? []}
        reservations={reservations ?? []}
        fromDate={fromStr}
        toDate={toStr}
      />
    </div>
  );
}
