import type { Metadata } from "next";
import "./globals.css";
import EnvBanner from "@/components/EnvBanner";

const isDev = process.env.NEXT_PUBLIC_ENV !== "production";
// 開発環境は常にnoindex。本番もNEXT_PUBLIC_NOINDEX=trueの間はnoindex
// （正式公開時はNetlifyの本番サイト環境変数からNEXT_PUBLIC_NOINDEXを削除）
const noIndex = isDev || process.env.NEXT_PUBLIC_NOINDEX === "true";

export const metadata: Metadata = {
  title: isDev
    ? "[DEV] MURA CAMPING GROUND - オンライン予約"
    : "MURA CAMPING GROUND - オンライン予約",
  description: "MURA CAMPING GROUNDのオンライン予約システム",
  robots: noIndex ? { index: false, follow: false } : undefined,
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
