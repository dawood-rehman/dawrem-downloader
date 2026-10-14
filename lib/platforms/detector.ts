import { SupportedPlatform } from '../config';

/**
 * Detects the media platform purely based on URL hostname and patterns.
 */
export function detectPlatform(rawUrl: string): SupportedPlatform | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');

    // 1. YouTube
    if (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtu.be'
    ) {
      return 'youtube';
    }

    // 2. Instagram
    if (
      host === 'instagram.com' ||
      host.endsWith('.instagram.com') ||
      host === 'instagr.am'
    ) {
      return 'instagram';
    }

    // 3. Facebook
    if (
      host === 'facebook.com' ||
      host.endsWith('.facebook.com') ||
      host === 'fb.watch' ||
      host === 'fb.com' ||
      host === 'm.facebook.com'
    ) {
      return 'facebook';
    }

    // 4. TikTok
    if (
      host === 'tiktok.com' ||
      host.endsWith('.tiktok.com') ||
      host === 'vt.tiktok.com' ||
      host === 'vm.tiktok.com'
    ) {
      return 'tiktok';
    }

    // 5. Pinterest
    if (
      host === 'pinterest.com' ||
      host.endsWith('.pinterest.com') ||
      host === 'pin.it' ||
      host === 'pinterest.co.uk' ||
      host === 'pinterest.ca'
    ) {
      return 'pinterest';
    }

    return null;
  } catch {
    return null;
  }
}
