import OptionsEditor from "./OptionsEditor";

export default function AdminOptionsPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800">オプション管理</h1>
        <p className="text-stone-500 text-sm mt-1">
          レンタル品や追加オプションを管理します。公開中のオプションは予約フォームに表示されます。
        </p>
      </div>
      <OptionsEditor />
    </div>
  );
}
