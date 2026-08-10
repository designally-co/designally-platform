import type { Metadata } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
import './globals.css';

/**
 * Inter carries Latin; Noto Sans Thai carries Thai. Both are applied together
 * so a bilingual string like "Start · เริ่มทำแบบสอบถาม" resolves per glyph on
 * one baseline. Self-hosted — a client on a poor connection in Thailand should
 * not be waiting on a font CDN.
 */
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-thai',
  subsets: ['thai'],
  weight: ['300', '400', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Designally',
  description: 'Designally platform',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
