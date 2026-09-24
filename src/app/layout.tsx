import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";

const beVietnam = localFont({
  src: [
    { path: "../../public/fonts/BeVietnamPro-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/BeVietnamPro-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/BeVietnamPro-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
    { path: "../../public/fonts/BeVietnamPro-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-be-vietnam",
  display: "swap",
});

const inter = localFont({
  src: [{ path: "../../public/fonts/Inter-Variable.ttf", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Học tiếng Anh online | WEWIN EDUCATION",
  description:
    "WEWIN EDUCATION — luyện thi VSTEP cho người học Việt Nam.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${beVietnam.variable} h-full antialiased`}
    >
      <body className="h-full font-[family-name:var(--font-be-vietnam)]">
        {children}
      </body>
    </html>
  );
}
