import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Q-Target | 품질 알람 및 관리 통합 플랫폼",
  description: "품질 알람, 관리대상, 조치계획을 한 곳에서 검토하는 인터랙티브 데모입니다.",
  openGraph: {
    title: "Q-Target | 품질 알람 및 관리 통합 플랫폼",
    description: "품질 알람과 조치계획을 한 곳에서 검토하는 인터랙티브 데모입니다.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Q-Target 품질 관리 플랫폼" }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
