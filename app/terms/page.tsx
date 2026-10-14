import type { Metadata } from 'next';
import { StaticInfoPage } from '@/components/StaticInfoPage';

export const metadata: Metadata = { title: 'Terms of Use', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return (
    <StaticInfoPage title="Terms of Use">
      <p><strong>Last updated: October 13, 2026.</strong> By using DAWREM Downloader, you agree to these terms.</p>
      <h2>Use only with permission</h2>
      <p>Use the service only for media you own or have explicit permission and legal rights to download, copy, convert, or otherwise process. You are responsible for complying with the source platform&apos;s terms, copyright law, privacy rights, and any restrictions that apply to the media.</p>
      <h2>Prohibited use</h2>
      <p>Do not use the service to bypass access controls, download private content without authorization, infringe intellectual-property or privacy rights, or interfere with the service or its providers. Do not submit another person&apos;s account credentials or session cookies.</p>
      <h2>Availability</h2>
      <p>Third-party platforms may change access or formats at any time. Downloads can fail, be delayed, or become unavailable. The service is provided without a guarantee that every link or format will work.</p>
      <h2>Contact</h2>
      <p>Questions or legal requests can be sent using the details on our <a href="/contact">Contact page</a>.</p>
    </StaticInfoPage>
  );
}
