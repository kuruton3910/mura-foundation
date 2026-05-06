import type { Metadata } from "next";
import "./globals.css";
import EnvBanner from "@/components/EnvBanner";

const isDev = process.env.NEXT_PUBLIC_ENV !== "production";

export const metadata: Metadata = {
  title: isDev
    ? "[DEV] MURA CAMPING GROUND - オンライン予約"
    : "MURA CAMPING GROUND - オンライン予約",
  description: "MURA CAMPING GROUNDのオンライン予約システム",
  // 開発環境は検索エンジンにインデックスさせない
  robots: isDev ? { index: false, follow: false } : undefined,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <EnvBanner />
        {children}
      </body>
    </html>
  );
}
