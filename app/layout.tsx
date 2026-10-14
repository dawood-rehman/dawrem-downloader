import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'DAWREM Downloader - Fast & Clean Multi-Platform Media Downloader',
  description:
    'Analyze supported media links and download content you own or are authorized to use.',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: 'DAWREM Downloader',
    description: 'Download media you own or are authorized to use.',
    siteName: 'DAWREM Downloader',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary',
    title: 'DAWREM Downloader',
    description: 'Download media you own or are authorized to use.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen selection:bg-indigo-500 selection:text-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
