"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function ViewToggle({ current }: { current: "list" | "calendar" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggle(view: "list" | "calendar") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`/admin/reservations?${params.toString()}`);
  }

  return (
    <div className="flex bg-stone-100 rounded-lg p-0.5">
      <button
        onClick={() => toggle("list")}
        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
          current === "list"
            ? "bg-white text-stone-800 shadow-sm font-medium"
            : "text-stone-500 hover:text-stone-700"
        }`}
      >
        <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        リスト
      </button>
      <button
        onClick={() => toggle("calendar")}
        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
          current === "calendar"
            ? "bg-white text-stone-800 shadow-sm font-medium"
            : "text-stone-500 hover:text-stone-700"
        }`}
      >
        <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        カレンダー
      </button>
    </div>
  );
}
