import type { Metadata } from 'next';
import { StaticInfoPage } from '@/components/StaticInfoPage';

export const metadata: Metadata = { title: 'Copyright and Takedown Requests', alternates: { canonical: '/copyright' } };

export default function CopyrightPage() {
  return (
    <StaticInfoPage title="Copyright and Takedown Requests">
      <p>DAWREM Downloader does not claim ownership of media hosted by third-party platforms. Users must only process media they own or are authorized to use.</p>
      <h2>Report a rights concern</h2>
      <p>If you believe this service is being used to infringe your rights, contact the site operator with the URL of the relevant content, a description of the rights you own or represent, your contact information, and a good-faith statement that the report is accurate. Include enough information for us to identify the material and review the request.</p>
      <p>Contact details are listed on our <a href="/contact">Contact page</a>. We will review complete notices and take appropriate action.</p>
      <p>Do not submit false or misleading notices.</p>
    </StaticInfoPage>
  );
}
