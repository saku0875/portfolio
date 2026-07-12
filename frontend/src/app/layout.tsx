import type { Metadata } from "next";
import Link from "next/link";
import Opening from "@/components/Opening";
import "./globals.css";

export const metadata: Metadata = {
  title: "村田つぐみ | Portfolio",
  description: "CS student · Game dev · Full-stack",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=M+PLUS+1+Code:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Opening />

        <nav className="sticky top-0 z-50 flex items-center gap-4 border-b-2 border-[var(--ink)] bg-[var(--paper)]/90 px-5 py-3 backdrop-blur">
          <Link href="/" className="disp text-base">
            村田<span className="text-[var(--akane)]">つぐみ</span>
          </Link>
          <div className="ml-auto flex gap-2">
            <Link href="/works" className="btn btn--mini">Works</Link>
            <Link href="/posts" className="btn btn--mini">Blog</Link>
            <Link href="/about" className="btn btn--mini">About</Link>
          </div>
        </nav>

        {children}

        <footer className="mt-24 border-t-2 border-[var(--ink)] bg-[var(--paper-2)] px-6 py-10 text-center">
          <p className="disp text-sm text-[var(--ink-soft)]">
            村田つぐみ ✦ Portfolio 2026
          </p>
        </footer>
      </body>
    </html>
  );
}