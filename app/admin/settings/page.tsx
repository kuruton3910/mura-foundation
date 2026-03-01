import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/booking/siteSettings";
import SettingsEditor from "./SettingsEditor";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const settings = { ...DEFAULT_SETTINGS, ...(data ?? {}) };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">サイト設定</h1>
      <p className="text-sm text-stone-500 mb-8">
        予約カレンダーのシーズンや受付期間を変更できます。変更はすぐに反映されます。
      </p>
      <SettingsEditor settings={settings} />
    </div>
  );
}
