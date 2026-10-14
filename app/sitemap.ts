import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/about', '/guide', '/privacy', '/terms', '/copyright', '/contact'].map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: route ? 'yearly' : 'monthly',
    priority: route ? 0.4 : 1,
  }));
}
