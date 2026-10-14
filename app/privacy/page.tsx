import type { Metadata } from 'next';
import { StaticInfoPage } from '@/components/StaticInfoPage';

export const metadata: Metadata = { title: 'Privacy Policy', alternates: { canonical: '/privacy' } };

export default function PrivacyPage() {
  return (
    <StaticInfoPage title="Privacy Policy">
      <p><strong>Last updated: October 13, 2026.</strong> This page describes how DAWREM Downloader handles information when you use this service.</p>
      <h2>Information processed</h2>
      <p>When you submit a media or profile link, the link and request data are sent to this service so it can request public metadata from the selected platform and prepare a download. Download jobs and temporary files are kept on the server for a limited period for delivery and cleanup.</p>
      <p>Session cookies are optional. If you enter one, it is held in the current browser page&apos;s memory, sent to this service with your profile request, and may be forwarded to the matching platform to perform that request. Do not submit credentials or cookies for an account you do not control. Refreshing the page clears the in-page cookie values.</p>
      <h2>Third-party services</h2>
      <p>This service may contact the social platform you select and media extraction providers used by the application. If advertising is enabled, Adsterra and its partners may use cookies, IP addresses, or similar technologies to deliver and measure ads. Review the applicable third-party privacy notices for their own data practices.</p>
      <h2>Retention and security</h2>
      <p>Temporary media and job records are intended to be removed after their processing window. No internet service can guarantee absolute security. Do not submit sensitive personal information.</p>
      <h2>Your choices</h2>
      <p>You can use public-link features without entering a session cookie. You may block cookies in your browser, though some ad and service functions may not work as intended.</p>
      <p>For privacy requests, use the contact details on our <a href="/contact">Contact page</a>.</p>
    </StaticInfoPage>
  );
}
