import type { Metadata } from 'next';
import { StaticInfoPage } from '@/components/StaticInfoPage';

export const metadata: Metadata = {
  title: 'How to Use DAWREM Downloader',
  description: 'A practical guide to supported links, format selection, privacy, and troubleshooting downloads on DAWREM.',
  alternates: { canonical: '/guide' },
};

export default function GuidePage() {
  return (
    <StaticInfoPage title="How to Use DAWREM Downloader">
      <p>Use this tool only with media you created or have permission to download and process. Platform terms and local copyright rules may restrict downloading even when a link is public.</p>
      <h2>Download one media item</h2>
      <ol>
        <li>Copy the HTTPS link to a supported media item.</li>
        <li>Paste it in <strong>Single Media</strong> and select <strong>Analyze</strong>.</li>
        <li>Check the title and available formats. Choose a format that suits your device and connection.</li>
        <li>Wait for preparation to finish, then select <strong>Save to Your Device</strong>.</li>
      </ol>
      <h2>Browse a profile or channel</h2>
      <ol>
        <li>Open <strong>Profile &amp; Channels</strong> and enter a public profile, channel, or supported playlist link.</li>
        <li>Review the returned items and use the filters to narrow the visible results.</li>
        <li>Select only items you are authorized to save, then use the batch download controls.</li>
      </ol>
      <h2>Supported services</h2>
      <p>The interface recognizes YouTube, Instagram, Facebook, TikTok, and Pinterest links. A recognized link does not guarantee that the provider exposes downloadable media. Providers can change availability or block automated requests.</p>
      <h2>Privacy and session cookies</h2>
      <p>Public links do not require a session cookie. Cookies are sensitive credentials that can grant access to your account. Avoid entering them; if you choose to, use only your own cookie, understand that it is sent with a profile request, and clear it from Settings when finished. Never share cookies with anyone.</p>
      <h2>Troubleshooting</h2>
      <ul>
        <li><strong>Link not recognized:</strong> copy the complete link from the source service and make sure it uses HTTPS.</li>
        <li><strong>Analysis failed:</strong> check that the item is available to you, then retry later. Private, removed, age-restricted, or region-restricted content may not work.</li>
        <li><strong>Download stopped:</strong> retry with a smaller or different available format and keep the page open until preparation finishes.</li>
        <li><strong>File did not save:</strong> select the save button after completion and check your browser&apos;s download list.</li>
      </ul>
      <p>When a link does not work, use the source platform&apos;s own download or export feature. See our <a href="/privacy">privacy policy</a>, <a href="/terms">terms</a>, and <a href="/contact">contact details</a>.</p>
    </StaticInfoPage>
  );
}
