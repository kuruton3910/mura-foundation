export default function Page() {
  return (
    <>
      <style>{`
        /* カスタムカラーの定義 */
        :root {
            --forest-green: #2D4030;
            --earth-brown: #785133;
            --soft-white: #F8F9F4;
        }
        .bg-forest { background-color: var(--forest-green); }
        .text-forest { color: var(--forest-green); }
        .bg-earth { background-color: var(--earth-brown); }
        .border-forest { border-color: var(--forest-green); }
      `}</style>
      <div className="bg-[#F8F9F4] text-stone-800 font-sans">
        <header className="bg-forest text-white py-6 shadow-md">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-wider">
                MURA CAMPING GROUND
              </h1>
              <p className="text-sm opacity-80">オンライン予約システム</p>
            </div>
            <div className="hidden md:block">
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">
                www.murafoundation.com
              </span>
            </div>
          </div>
        </header>

        <nav className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-forest text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <span className="text-xs mt-2 font-bold">条件入力</span>
            </div>
            <div className="w-12 h-1 bg-gray-200"></div>
            <div className="flex flex-col items-center opacity-40">
              <div className="w-10 h-10 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <span className="text-xs mt-2">規約承認</span>
            </div>
            <div className="w-12 h-1 bg-gray-200"></div>
            <div className="flex flex-col items-center opacity-40">
              <div className="w-10 h-10 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <span className="text-xs mt-2">情報入力</span>
            </div>
            <div className="w-12 h-1 bg-gray-200"></div>
            <div className="flex flex-col items-center opacity-40">
              <div className="w-10 h-10 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <span className="text-xs mt-2">決済</span>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 pb-20">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3 space-y-8">
              <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <h2 className="text-xl font-bold mb-6 flex items-center border-l-4 border-forest pl-3">
                  1. 日付の選択
                </h2>

                <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-900">
                      NAKAMA (賛助会員) ですか？
                    </span>
                    <p className="text-sm text-amber-800">
                      会員は60日前から予約可能です
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-forest after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-stone-100 p-4 flex justify-between items-center border-b">
                    <button className="font-bold">&lt; 2026年 4月</button>
                    <span className="font-bold text-lg">2026年 5月</span>
                    <button className="font-bold">6月 &gt;</button>
                  </div>
                  <div className="grid grid-cols-7 text-center bg-stone-50 text-xs py-2 border-b">
                    <div className="text-red-500">日</div>
                    <div>月</div>
                    <div>火</div>
                    <div>水</div>
                    <div>木</div>
                    <div>金</div>
                    <div className="text-blue-500">土</div>
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-gray-200">
                    <div className="bg-white p-2 h-20 flex flex-col items-center opacity-30">
                      <span className="text-sm">26</span>
                    </div>
                    <div className="bg-white p-2 h-20 flex flex-col items-center hover:bg-green-50 cursor-pointer border-2 border-transparent hover:border-forest transition-all">
                      <span className="text-sm">1</span>
                      <span className="text-[10px] mt-1 text-forest">
                        残り3区画
                      </span>
                    </div>
                    <div className="bg-emerald-100 p-2 h-20 flex flex-col items-center border-2 border-forest relative">
                      <span className="text-sm font-bold">2</span>
                      <span className="text-[10px] mt-1">選択中</span>
                      <div className="absolute bottom-1 w-2 h-2 bg-forest rounded-full"></div>
                    </div>
                    {Array.from({ length: 29 }, (_, i) => (
                      <div
                        key={i + 3}
                        className="bg-white p-2 h-20 flex flex-col items-center hover:bg-green-50 cursor-pointer"
                      >
                        <span className="text-sm">{i + 3}</span>
                        <span className="text-[10px] mt-1 text-forest italic">
                          残り5区画
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <h2 className="text-xl font-bold mb-6 flex items-center border-l-4 border-forest pl-3">
                  2. 利用構成と人数
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block font-bold mb-2">
                      車両台数（区画数）
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      ※1台につき1区画の予約となります。
                    </p>
                    <select className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-forest outline-none">
                      <option>1台 (1区画)</option>
                      <option>2台 (2区画)</option>
                      <option>3台 (3区画)</option>
                      <option>4台 (4区画)</option>
                      <option>5台 (5区画)</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="block font-bold mb-2">人数内訳</label>
                    <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg">
                      <span>大人 (中学生以上)</span>
                      <div className="flex items-center space-x-4">
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">
                          -
                        </button>
                        <span className="font-bold w-4 text-center">2</span>
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg">
                      <span>子ども (小学生以下)</span>
                      <div className="flex items-center space-x-4">
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">
                          -
                        </button>
                        <span className="font-bold w-4 text-center">0</span>
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg text-forest font-medium">
                      <span>ペット</span>
                      <div className="flex items-center space-x-4">
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">
                          -
                        </button>
                        <span className="font-bold w-4 text-center">0</span>
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <h2 className="text-xl font-bold mb-6 flex items-center border-l-4 border-forest pl-3">
                  3. 追加オプション（レンタル品）
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                    <input type="checkbox" className="w-5 h-5 accent-forest" />
                    <div className="ml-4">
                      <span className="block font-bold">レンタルテント</span>
                      <span className="text-sm text-gray-500">
                        ¥3,000 / 1張
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                    <input type="checkbox" className="w-5 h-5 accent-forest" />
                    <div className="ml-4">
                      <span className="block font-bold">焚き火台セット</span>
                      <span className="text-sm text-gray-500">
                        ¥1,500 / 1台
                      </span>
                    </div>
                  </label>
                </div>
              </section>
            </div>

            <div className="lg:w-1/3">
              <div className="sticky top-8 space-y-4">
                <div className="bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden">
                  <div className="bg-forest text-white p-4 font-bold text-center">
                    現在の予約内容
                  </div>
                  <div className="p-6 space-y-6">
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">宿泊日</dt>
                        <dd className="font-bold">
                          2026年5月2日(土) - 3日(日)
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">車両・区画</dt>
                        <dd className="font-bold">1台 (1区画)</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">人数</dt>
                        <dd className="font-bold">大人 2名</dd>
                      </div>
                    </dl>

                    <hr />

                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                      <h4 className="text-red-800 text-xs font-bold mb-2 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clip-rule="evenodd"
                          ></path>
                        </svg>
                        重要ルール
                      </h4>
                      <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                        <li>
                          <strong>利用時間：11AM 〜 翌11AM</strong>
                        </li>
                        <li>
                          <strong>20:00〜5:00は車の出入り禁止</strong>
                        </li>
                      </ul>
                    </div>

                    <div className="text-center">
                      <span className="text-sm text-gray-500">
                        合計金額 (税込)
                      </span>
                      <div className="text-3xl font-bold text-forest mt-1">
                        ¥5,500
                      </div>
                    </div>

                    <button className="w-full bg-forest hover:bg-opacity-90 text-white font-bold py-4 rounded-lg shadow-md transition-all transform hover:-translate-y-1">
                      利用規約の確認へ進む
                    </button>
                    <p className="text-[10px] text-center text-gray-400 mt-2">
                      ※次の画面で20項目の利用規約への同意が必要です。
                    </p>
                  </div>
                </div>

                <div className="text-center p-4 bg-stone-100 rounded-lg">
                  <p className="text-xs text-stone-500">お困りの際はこちら</p>
                  <a
                    href="#"
                    className="text-xs font-bold text-forest underline mt-1 block"
                  >
                    よくある質問とヘルプ
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-stone-200 py-8 text-center text-stone-500 text-sm">
          &copy; 2026 MURA CAMPING GROUND. Powered by murafoundation.com
        </footer>
      </div>
    </>
  );
}
