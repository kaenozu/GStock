import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GStock | 次世代株価予想ダッシュボード",
  description: "AIとテクニカル分析を融合した、投資家のための高度な株価予想プラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <div className="app-container">
          {children}
        </div>
        <Toaster theme="dark" richColors position="bottom-right" />
      </body>
    </html>
  );
}
