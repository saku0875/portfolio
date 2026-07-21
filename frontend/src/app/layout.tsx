import type { Metadata } from "next";
import {
  Shippori_Mincho,
  Zen_Kaku_Gothic_New,
  M_PLUS_1_Code,
} from "next/font/google";
import Opening from "@/components/Opening";
import "./globals.css";

const serif = Shippori_Mincho({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  preload: false,
});

const sans = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
});

const mono = M_PLUS_1_Code({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "村田つぐみ | Portfolio",
  description: "CS student · Game dev · Full-stack",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
      </head>
      <body>
        <Opening />
        <nav className="nav">
          <a className="nav__logo" href="#hero">
            <em>portfolio</em>
          </a>
          <div className="nav__links">
            <a href="#videos">VIDEOS</a>
            <a href="#about">ABOUT</a>
            <a href="#works">WORKS</a>
            <a href="#blog">BLOG</a>
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