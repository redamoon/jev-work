"use client";

import { useRef, useState } from "react";

type ClassifyResult =
  | {
      ocrText: string;
      readable: false;
      readableProbability: number;
    }
  | {
      ocrText: string;
      readable: true;
      readableProbability: number;
      account: string;
      probability: number;
      confidence: number;
      alternatives: { account: string; probability: number }[];
    };

type ClassifyError = { error: string };

// Choiceの確信度（分布の集中度）がこの値を下回ったら、結果を鵜呑みにしないよう警告する
const LOW_CONFIDENCE_THRESHOLD = 0.5;

function isError(
  result: ClassifyResult | ClassifyError,
): result is ClassifyError {
  return "error" in result;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function ReceiptClassifier() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setErrorMessage(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/classify", {
        method: "POST",
        body: formData,
      });
      const data: ClassifyResult | ClassifyError = await response.json();

      if (!response.ok || isError(data)) {
        setErrorMessage(isError(data) ? data.error : "判定に失敗しました。");
        return;
      }

      setResult(data);
    } catch {
      setErrorMessage("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-background font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          レシート画像を選択
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {previewUrl && (
        // OCR対象のプレビュー表示のみで最適化不要のため img を使用
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="アップロードしたレシートのプレビュー"
          className="max-h-64 w-full rounded-lg border border-black/[.08] object-contain dark:border-white/[.145]"
        />
      )}

      {loading && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          OCR・仕訳判定中です…（初回はOCRの言語データ読み込みで時間がかかります）
        </p>
      )}

      {errorMessage && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMessage}
        </p>
      )}

      {result && !result.readable && (
        <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] p-5 dark:border-white/[.145]">
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            OCRでレシートの内容を読み取れませんでした（読み取れた確率{" "}
            {formatPercent(result.readableProbability)}
            ）。明るい場所で正面から撮り直すか、別の画像でお試しください。
          </p>

          <details className="text-sm text-zinc-600 dark:text-zinc-400">
            <summary className="cursor-pointer select-none">
              OCR抽出テキストを表示
            </summary>
            <pre className="mt-2 whitespace-pre-wrap rounded bg-black/[.03] p-3 text-xs dark:bg-white/[.05]">
              {result.ocrText}
            </pre>
          </details>
        </div>
      )}

      {result && result.readable && (
        <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] p-5 dark:border-white/[.145]">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              推定 借方勘定科目
            </p>
            <p className="text-2xl font-semibold">{result.account}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              確率 {formatPercent(result.probability)} ／ 確信度{" "}
              <span
                className={
                  result.confidence < LOW_CONFIDENCE_THRESHOLD
                    ? "font-semibold text-amber-600 dark:text-amber-400"
                    : undefined
                }
              >
                {formatPercent(result.confidence)}
              </span>
            </p>
          </div>

          {result.confidence < LOW_CONFIDENCE_THRESHOLD && (
            <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              確信度が低い判定です。OCRの読み取りが不十分な可能性があるため、この推定結果は参考程度にとどめ、内容を確認してください。
            </p>
          )}

          {result.alternatives.length > 0 && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
                次点候補
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {result.alternatives.map((alt) => (
                  <li
                    key={alt.account}
                    className="flex items-center justify-between"
                  >
                    <span>{alt.account}</span>
                    <span className="text-zinc-500">
                      {formatPercent(alt.probability)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="text-sm text-zinc-600 dark:text-zinc-400">
            <summary className="cursor-pointer select-none">
              OCR抽出テキストを表示
            </summary>
            <pre className="mt-2 whitespace-pre-wrap rounded bg-black/[.03] p-3 text-xs dark:bg-white/[.05]">
              {result.ocrText}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
