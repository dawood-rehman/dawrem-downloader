const DEFAULT_SITE_URL = 'https://dawremdownloader.com';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '');
