import type { Metadata } from "next";
import {
  Be_Vietnam_Pro,
  Inter,
  JetBrains_Mono,
  Noto_Sans_SC,
  Plus_Jakarta_Sans,
} from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-be-vietnam",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sans-sc",
  display: "swap",
  weight: ["400", "500", "700"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Học tiếng Anh online | WEWIN EDUCATION",
  description:
    "WEWIN EDUCATION — học tiếng Anh dễ dàng. Lộ trình Lớp 1–9, bài tập, đề thi thử, video và game hoá.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${jakarta.variable} ${inter.variable} ${beVietnam.variable} ${notoSansSC.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="h-full font-[family-name:var(--font-jakarta)]">
        {children}
      </body>
    </html>
  );
}
