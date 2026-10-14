import type { Metadata } from 'next';
import { StaticInfoPage } from '@/components/StaticInfoPage';

export const metadata: Metadata = {
  title: 'About DAWREM Downloader',
  description: 'Learn what DAWREM Downloader does, how it handles media links, and its responsible-use limits.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <StaticInfoPage title="About DAWREM Downloader">
      <p>DAWREM Downloader is a browser-based utility for preparing copies of media that visitors own or have permission to download and process.</p>
      <h2>How it works</h2>
      <p>When a supported public link is submitted, the service asks the relevant provider for available media information, then prepares the chosen format for download. Some provider links may stop working when the provider changes its service.</p>
      <h2>Respect creators and platform rules</h2>
      <p>DAWREM does not own the media processed by this service. Users are responsible for obtaining permission and following the source platform&apos;s terms and applicable law.</p>
      <p>Read our <a href="/guide">usage guide</a>, <a href="/terms">terms</a>, and <a href="/copyright">copyright policy</a>.</p>
    </StaticInfoPage>
  );
}
