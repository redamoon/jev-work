import { ReceiptClassifier } from "@/components/ReceiptClassifier";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-6 py-16 sm:py-24">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50 sm:text-3xl">
            レシート仕訳アシスタント
          </h1>
          <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            レシート画像をOCRで読み取り、Jev
            (TypeSafe) が借方勘定科目を確率付きで推定します。
          </p>
        </div>
        <ReceiptClassifier />
      </main>
    </div>
  );
}
