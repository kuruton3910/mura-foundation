// 開発環境を一目でわかるようにするバナー
// NEXT_PUBLIC_ENV=production 以外（development, preview, 未設定）で表示される
export default function EnvBanner() {
  const env = process.env.NEXT_PUBLIC_ENV;
  if (env === "production") return null;

  return (
    <div className="bg-amber-500 text-white text-center text-xs font-bold py-1.5 px-4 sticky top-0 z-50 shadow-md">
      ⚠ 開発環境（DEVELOPMENT） — このサイトは動作確認用です。決済はテストモードで実課金されません。
    </div>
  );
}
