import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "frankSQUARE月次報告",
  description: "SESエンジニア向け月次報告書作成・管理システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
