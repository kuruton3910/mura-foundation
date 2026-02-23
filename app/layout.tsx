import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MURA CAMPING GROUND - オンライン予約",
  description: "MURA CAMPING GROUNDのオンライン予約システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
