import { ProfilePlatform } from './types';

export interface ProfileInputDetection {
  platform: ProfilePlatform | null;
  normalizedUrl: string;
  isPlaylist: boolean;
  cleanUsername: string;
  isUrl: boolean;
}

export function detectProfileInput(
  rawInput: string,
  preferredPlatform?: ProfilePlatform
): ProfileInputDetection {
  const input = rawInput.trim();
  let parsedUrl: URL | null = null;

  try {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      parsedUrl = new URL(input);
    } else if (input.includes('.') && (input.includes('.com') || input.includes('.be') || input.includes('.it'))) {
      parsedUrl = new URL(`https://${input}`);
    }
  } catch {
    parsedUrl = null;
  }

  // 1. Detect from URL
  if (parsedUrl) {
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    const pathname = parsedUrl.pathname;

    // YouTube
    if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
      const isPlaylist = parsedUrl.searchParams.has('list') || pathname.startsWith('/playlist');
      let username = pathname.replace(/^\/@?/, '').split('/')[0] || '';
      if (pathname.startsWith('/channel/') || pathname.startsWith('/c/') || pathname.startsWith('/user/')) {
        username = pathname.split('/')[2] || '';
      }
      return {
        platform: 'youtube',
        normalizedUrl: parsedUrl.toString(),
        isPlaylist,
        cleanUsername: username,
        isUrl: true,
      };
    }

    // Instagram
    if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am') {
      const parts = pathname.split('/').filter(Boolean);
      const username = parts[0] && !['p', 'reel', 'stories', 'explore', 'direct'].includes(parts[0])
        ? parts[0]
        : '';
      return {
        platform: 'instagram',
        normalizedUrl: parsedUrl.toString(),
        isPlaylist: false,
        cleanUsername: username,
        isUrl: true,
      };
    }

    // TikTok
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com') || host === 'vt.tiktok.com' || host === 'vm.tiktok.com') {
      const parts = pathname.split('/').filter(Boolean);
      let username = '';
      if (parts[0]?.startsWith('@')) {
        username = parts[0].substring(1);
      }
      return {
        platform: 'tiktok',
        normalizedUrl: parsedUrl.toString(),
        isPlaylist: false,
        cleanUsername: username,
        isUrl: true,
      };
    }

    // Facebook
    if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com') {
      const parts = pathname.split('/').filter(Boolean);
      let username = parts[0] || '';
      if (username === 'profile.php' && parsedUrl.searchParams.has('id')) {
        username = parsedUrl.searchParams.get('id') || '';
      }
      return {
        platform: 'facebook',
        normalizedUrl: parsedUrl.toString(),
        isPlaylist: false,
        cleanUsername: username,
        isUrl: true,
      };
    }

    // Pinterest
    if (host === 'pinterest.com' || host.endsWith('.pinterest.com') || host === 'pin.it') {
      const parts = pathname.split('/').filter(Boolean);
      const username = parts[0] || '';
      return {
        platform: 'pinterest',
        normalizedUrl: parsedUrl.toString(),
        isPlaylist: false,
        cleanUsername: username,
        isUrl: true,
      };
    }
  }

  // 2. Handle username / handle directly
  const cleanUsername = input.replace(/^@/, '').trim();
  const platform = preferredPlatform || 'youtube';

  let normalizedUrl = '';
  switch (platform) {
    case 'youtube':
      normalizedUrl = `https://www.youtube.com/@${cleanUsername}`;
      break;
    case 'instagram':
      normalizedUrl = `https://www.instagram.com/${cleanUsername}/`;
      break;
    case 'tiktok':
      normalizedUrl = `https://www.tiktok.com/@${cleanUsername}`;
      break;
    case 'facebook':
      normalizedUrl = `https://www.facebook.com/${cleanUsername}`;
      break;
    case 'pinterest':
      normalizedUrl = `https://www.pinterest.com/${cleanUsername}/`;
      break;
  }

  return {
    platform: preferredPlatform || null,
    normalizedUrl,
    isPlaylist: false,
    cleanUsername,
    isUrl: false,
  };
}
