import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

// Pretendard 폰트 로드
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "QMS - Quality Management System",
  description: "품질 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link 
          rel="preconnect" 
          href="https://cdn.jsdelivr.net" 
        />
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" 
        />
      </head>
      <body className={inter.variable}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
