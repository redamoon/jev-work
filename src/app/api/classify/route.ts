import { NextResponse } from "next/server";
import { createWorker, type Worker } from "tesseract.js";
import { choice, noul } from "@typesafe-ai/sdk";
import { getTypeSafeClient } from "@/lib/typesafe";
import { EXPENSE_ACCOUNTS, type ExpenseAccount } from "@/lib/accounts";

export const runtime = "nodejs";
export const maxDuration = 60;

// OCRテキストがレシートとして意味を成しているとみなす下限確率。
// 下回った場合は勘定科目の判定自体を行わず、読み取り不良として返す。
const READABLE_THRESHOLD = 0.5;

// OCR ワーカーはコールドスタートごとに言語データを読み込むため、
// warm なランタイム内では使い回す。
let workerPromise: Promise<Worker> | null = null;
function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("jpn");
  }
  return workerPromise;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "image フィールドに画像ファイルを指定してください。" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let ocrText: string;
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(buffer);
    ocrText = data.text.trim();
  } catch (error) {
    console.error("OCR failed", error);
    return NextResponse.json(
      { error: "OCR処理に失敗しました。画像を確認してください。" },
      { status: 502 },
    );
  }

  if (!ocrText) {
    return NextResponse.json(
      { error: "画像からテキストを読み取れませんでした。" },
      { status: 422 },
    );
  }

  let client;
  try {
    client = getTypeSafeClient();
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "TypeSafe(Jev) の設定エラーです。サーバー管理者に連絡してください。" },
      { status: 500 },
    );
  }

  const criteria = Object.fromEntries(
    Object.entries(EXPENSE_ACCOUNTS).map(([name, description]) => [
      name,
      description,
    ]),
  ) as Record<ExpenseAccount, string>;

  try {
    const result = await client.systemOne({
      state: { receiptText: ocrText },
      questions: {
        readable: noul(
          "このOCRテキスト `receiptText` は、レシート・領収書の内容として日本語で意味が通るか。",
          {
            true: "店名・金額・品目など、レシートとして自然に読める内容が含まれている",
            false: "文字化けや無関係な文字列の羅列で、レシートの内容として意味を成さない",
          },
        ),
        account: choice(
          "このレシート・領収書のOCRテキスト `receiptText` は、経費精算における借方のどの勘定科目に最も該当するか。",
          criteria,
        ),
      },
    });

    const readableProbability = result.answers.readable.noul;

    if (readableProbability < READABLE_THRESHOLD) {
      return NextResponse.json({
        ocrText,
        readable: false,
        readableProbability,
      });
    }

    const answer = result.answers.account;
    const alternatives = Object.entries(answer.probabilities)
      .filter(([name]) => name !== answer.choice)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([account, probability]) => ({ account, probability }));

    return NextResponse.json({
      ocrText,
      readable: true,
      readableProbability,
      account: answer.choice,
      probability: answer.probabilities[answer.choice],
      confidence: answer.confidence,
      alternatives,
    });
  } catch (error) {
    console.error("Jev classification failed", error);
    return NextResponse.json(
      { error: "仕訳判定に失敗しました。時間をおいて再度お試しください。" },
      { status: 502 },
    );
  }
}
