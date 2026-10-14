import { z } from 'zod';
import { InvalidUrlError, UnsupportedPlatformError } from '../errors/downloader-errors';
import { detectPlatform } from '../platforms/detector';

// Schema for raw payload validation
export const AnalyzeRequestSchema = z.object({
  url: z
    .string({
      required_error: 'URL is required',
    })
    .trim()
    .min(5, 'URL is too short')
    .max(2048, 'URL exceeds maximum length'),
});

export const DownloadRequestSchema = z.object({
  url: z.string().trim().min(5).max(2048),
  formatId: z.string().trim().min(1).max(100),
  platform: z.enum(['youtube', 'instagram', 'facebook', 'tiktok', 'pinterest']),
  removeWatermark: z.boolean().optional().default(false),
});

/**
 * Validates whether a given URL is safe, reachable via HTTPS,
 * not targeting local network/SSRF, and corresponds to a supported platform.
 */
export function validateAndSanitizeUrl(rawUrl: string): { sanitizedUrl: string; platform: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new InvalidUrlError('A valid URL string must be provided.');
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InvalidUrlError('Invalid URL structure. Ensure it begins with http:// or https://');
  }

  // Require HTTPS so source links and submitted credentials are not sent in clear text.
  if (parsed.protocol !== 'https:') {
    throw new InvalidUrlError('Only HTTPS URLs are permitted.');
  }

  // SSRF Protection: prevent localhost and internal private IP targets
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    throw new InvalidUrlError('Target host is not permitted.');
  }

  // Detect supported platform
  const platform = detectPlatform(parsed.href);
  if (!platform) {
    throw new UnsupportedPlatformError();
  }

  return {
    sanitizedUrl: parsed.href,
    platform,
  };
}
