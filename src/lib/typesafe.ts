import { TypeSafeClient } from "@typesafe-ai/sdk";

/**
 * TYPESAFE_API_KEY はサーバーサイドのみで参照する。クライアントに公開しない。
 */
export function getTypeSafeClient(): TypeSafeClient {
  if (!process.env.TYPESAFE_API_KEY) {
    throw new Error(
      "TYPESAFE_API_KEY が設定されていません。.env.local に設定してください。",
    );
  }
  return new TypeSafeClient();
}
