"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin", label: "ダッシュボード", icon: "⬛" },
  { href: "/admin/reservations", label: "予約一覧", icon: "📋" },
  { href: "/admin/availability", label: "空き状況管理", icon: "📅" },
  { href: "/admin/coupons", label: "クーポン管理", icon: "🎫" },
  { href: "/admin/settings", label: "サイト設定", icon: "⚙️" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  // Don't show sidebar on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-stone-100 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#2D4030] text-white flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-white/10">
          <h1 className="text-lg font-bold tracking-wide">MURA 管理</h1>
          <p className="text-xs text-white/50 mt-0.5">CAMPING GROUND</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span>🚪</span>
            ログアウト
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
