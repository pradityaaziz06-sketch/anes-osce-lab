import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/sora';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'ANES OSCE LAB · Tiara Bunda Edition',
  description: 'Interactive OSCE simulator for D4 Keperawatan Anestesiologi, Politeknik Tiara Bunda, Cinere, Depok.',
};
export const viewport: Viewport = { themeColor: '#050914', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-pulse focus:px-4 focus:py-2 focus:text-ink-950">
          Skip to content
        </a>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
