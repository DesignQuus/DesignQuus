import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI HVAC Engineering OS',
  description: '법령·설계·장비·시공·이력관리를 연결하는 AI 설비 엔지니어링 운영체계',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
