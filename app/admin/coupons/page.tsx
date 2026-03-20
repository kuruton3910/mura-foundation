import { createServerClient } from "@/lib/supabase/server";
import CouponsEditor from "./CouponsEditor";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const supabase = createServerClient();

  const { data: coupons } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">クーポン管理</h1>
      <p className="text-sm text-stone-500 mb-6">
        NAKAMA会員向け割引クーポンなどを管理します。
      </p>
      <CouponsEditor coupons={coupons ?? []} />
    </div>
  );
}
