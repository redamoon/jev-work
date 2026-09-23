# レシート仕訳アシスタント

レシート・領収書の画像をアップロードすると、OCR（Tesseract.js）でテキストを抽出し、
[Jev (TypeSafe)](https://typesafe.ai) が借方勘定科目を確率付きで推定するWebアプリ。

## セットアップ

```bash
npm install
# .env.local を作成し、以下を1行追加する
#   TYPESAFE_API_KEY=your-typesafe-api-key-here
npm run dev
```

http://localhost:3000 を開いてレシート画像をアップロードする。

## 仕組み

1. `src/components/ReceiptClassifier.tsx` が画像を `/api/classify` へ送信
2. `src/app/api/classify/route.ts` が Tesseract.js（日本語）でOCRを実行
3. OCRテキストを Jev の `choice()` 判定に渡し、`src/lib/accounts.ts` に定義した
   勘定科目リストから最も該当する科目・確率・確信度・次点候補を取得
4. 結果をJSONで返し、画面に表示

## スコープ（MVP）

- 借方勘定科目の推定のみ（貸方や金額仕訳は未対応）
- 勘定科目リストは経費精算でよく使う14科目（`src/lib/accounts.ts`）
- OCR言語は日本語（`jpn`）固定

## 今後の拡張候補

- 貸方科目（現金・クレジットカード等）の判定を追加し複式仕訳を生成
- OCRからの金額・日付・店名の構造化抽出（Jevの値抽出パターン）
- 勘定科目リストのカスタマイズ機能（会社ごとの科目マスタ対応）
- 低確信度時のレビュー導線（人手確認へのエスカレーション）
