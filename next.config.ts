import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // tesseract.js はワーカースクリプトを実行時に相対パスで require するため、
  // バンドルさせず Node の通常解決に任せる。
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;
