"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin", label: "ダッシュボード", icon: "⬛" },
  { href: "/admin/reservations", label: "予約一覧", icon: "📋" },
  { href: "/admin/availability", label: "空き状況管理", icon: "📅" },
  { href: "/admin/coupons", label: "クーポン管理", icon: "🎫" },
  { href: "/admin/options", label: "オプション管理", icon: "🛒" },
  { href: "/admin/settings", label: "サイト設定", icon: "⚙️" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // モバイル用サイドバーの開閉状態
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  // ログインページではサイドバーを表示しない
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // ナビゲーション項目クリック時にモバイルサイドバーを閉じる
  function handleNavClick() {
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col lg:flex-row">
      {/* モバイル用ヘッダーバー（lg以上では非表示） */}
      <header className="lg:hidden flex items-center justify-between bg-[#2D4030] text-white px-4 py-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-wide">MURA 管理</h1>
          <p className="text-xs text-white/50">CAMPING GROUND</p>
        </div>
        {/* ハンバーガーメニューボタン */}
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="メニューを開く"
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {/* モバイル用オーバーレイ（サイドバー表示時に背景を暗くする） */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#2D4030] text-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0 lg:w-56 lg:shrink-0
        `}
      >
        {/* サイドバーヘッダー */}
        <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-wide">MURA 管理</h1>
            <p className="text-xs text-white/50 mt-0.5">CAMPING GROUND</p>
          </div>
          {/* モバイル用閉じるボタン（lg以上では非表示） */}
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="メニューを閉じる"
            className="lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ナビゲーション */}
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
                onClick={handleNavClick}
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

        {/* ログアウトボタン */}
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

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
