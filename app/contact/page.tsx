import type { Metadata } from 'next';
import { StaticInfoPage } from '@/components/StaticInfoPage';

export const metadata: Metadata = { title: 'Contact', alternates: { canonical: '/contact' } };

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <StaticInfoPage title="Contact">
      <p>For support, privacy questions, or copyright notices, contact the site operator:</p>
      {email ? (
        <p><a href={`mailto:${email}`}>{email}</a></p>
      ) : (
        <p>Public contact details have not been configured yet. The site owner must set <code>NEXT_PUBLIC_CONTACT_EMAIL</code> before launch.</p>
      )}
    </StaticInfoPage>
  );
}
