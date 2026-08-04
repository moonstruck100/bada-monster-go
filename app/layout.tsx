import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "바다몬스터고",
  description: "사진 한 장으로 시작하는 부산 바다 정화 모험",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
