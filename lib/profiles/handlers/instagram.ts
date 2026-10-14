import axios from 'axios';
import youtubedl from 'yt-dlp-exec';
import { ProfileFetchOptions, ProfileFetchResult, ProfileMediaItem, UserProfileInfo } from '../types';

/**
 * Cleanly decodes HTML entities (including emojis, @ symbols, etc.)
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#064;/g, '@')
    .replace(/&#x200f;|&#x200e;/g, '')
    .trim();
}

/**
 * Normalizes numbers with K, M, B suffixes
 */
function parseCount(str?: string): number | undefined {
  if (!str) return undefined;
  const clean = str.replace(/,/g, '').trim().toUpperCase();
  if (clean.endsWith('K')) return Math.round(parseFloat(clean) * 1_000);
  if (clean.endsWith('M')) return Math.round(parseFloat(clean) * 1_000_000);
  if (clean.endsWith('B')) return Math.round(parseFloat(clean) * 1_000_000_000);
  const n = parseInt(clean, 10);
  return isNaN(n) ? undefined : n;
}

export async function fetchInstagramProfile(
  options: ProfileFetchOptions
): Promise<ProfileFetchResult> {
  const rawInput = options.query
    .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, '')
    .replace(/^\/?@?/, '')
    .split('/')[0]
    .split('?')[0]
    .trim();

  if (!rawInput) {
    throw new Error('Please provide a valid Instagram username or profile URL.');
  }

  // Generate candidate usernames: handle cases like leading/trailing dots "._dawood_rehman._" -> "_dawood_rehman_"
  const candidateList = [
    rawInput,
    rawInput.replace(/^\.+|\.+$/g, ''),
    rawInput.replace(/^\.+|\.+$/g, '').replace(/^\._/, '_').replace(/\._$/, '_'),
    rawInput.replace(/^[._]+|[._]+$/g, (m) => (m.includes('_') ? '_' : '')),
  ].filter(Boolean);

  const candidates = [...new Set(candidateList)];

  const desktopHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };

  if (options.sessionCookie) {
    let cleanCookie = options.sessionCookie.trim();
    if (cleanCookie.startsWith('sessionid=')) {
      cleanCookie = cleanCookie.replace(/^sessionid=/, '').trim();
    }
    // If full cookie header with key=value pairs was pasted
    if (cleanCookie.includes(';')) {
      desktopHeaders['Cookie'] = cleanCookie;
    } else {
      // Handles both URL-encoded and URL-decoded values seamlessly
      desktopHeaders['Cookie'] = `sessionid=${cleanCookie}`;
    }
  }

  let html = '';
  let cleanUsername = candidates[0];

  // Try candidates to find the live profile
  for (const cand of candidates) {
    try {
      const res = await axios.get(`https://www.instagram.com/${cand}/`, {
        headers: desktopHeaders,
        timeout: 10000,
        maxRedirects: 5,
      });
      const data = String(res.data || '');
      const hasOg = data.includes('og:title') && !data.includes('Page Not Found');
      const hasUserData = data.includes('profile_id') || data.includes('biography');
      if (hasOg || hasUserData) {
        html = data;
        cleanUsername = cand;
        break;
      }
    } catch {
      // try next candidate
    }
  }

  if (!html) {
    throw new Error(`Instagram profile for "${options.query}" was not found or could not be loaded.`);
  }

  const profileUrl = `https://www.instagram.com/${cleanUsername}/`;

  // 1. Profile Metadata
  const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]*)"/i);
  const ogDescMatch = html.match(/<meta property="og:description" content="([^"]*)"/i);
  const ogImgMatch = html.match(/<meta property="og:image" content="([^"]*)"/i);

  const rawTitle = ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1]) : cleanUsername;
  let displayName = rawTitle.split('(')[0]?.trim() || cleanUsername;
  if (!displayName || displayName === cleanUsername) {
    const fnMatch = html.match(/"full_name":"([^"]*)"/);
    if (fnMatch) displayName = decodeHtmlEntities(fnMatch[1]);
  }

  const rawBio = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1]) : '';
  let bio: string | undefined = rawBio;
  const bioMatch = html.match(/"biography":"([^"]*)"/);
  if (bioMatch) {
    bio = decodeHtmlEntities(
      bioMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    );
  }

  let followerCount: number | undefined;
  let followingCount: number | undefined;
  let mediaCount: number | undefined;
  if (rawBio) {
    const folM = rawBio.match(/([0-9,.]+[kmb]?)\s+Followers/i);
    const fingM = rawBio.match(/([0-9,.]+[kmb]?)\s+Following/i);
    const postM = rawBio.match(/([0-9,.]+[kmb]?)\s+Posts/i);
    if (folM) followerCount = parseCount(folM[1]);
    if (fingM) followingCount = parseCount(fingM[1]);
    if (postM) mediaCount = parseCount(postM[1]);
  }

  const avatarUrl = ogImgMatch ? ogImgMatch[1].replace(/\\/g, '').replace(/&amp;/g, '&') : undefined;

  // Blue Tick Verified
  const isVerified = html.includes('"is_verified":true');

  // Privacy strictly detected - NEVER mark public accounts as private!
  let isPrivate = false;
  if (html.includes('"is_private":true')) {
    isPrivate = true;
  } else if (html.includes('"is_private":false')) {
    isPrivate = false;
  } else if (html.includes('This Account is Private') || html.includes('This account is private')) {
    isPrivate = true;
  }

  let profileId = cleanUsername;
  const pIdMatch = html.match(/"profile_id":"(\d+)"/);
  if (pIdMatch) profileId = pIdMatch[1];

  // 2. Media Items Extraction (Posts, Reels, Highlights, Stories)
  const itemsMap = new Map<string, ProfileMediaItem>();

  // Extract Polaris media nodes from SSR
  const nodeRegex =
    /"node":\{"__typename":"(XIGPolaris[a-zA-Z0-9_]+)",.*?"pk":"(\d+)","code":"([a-zA-Z0-9_-]+)".*?"display_uri":"([^"]+)"/g;
  let m;
  while ((m = nodeRegex.exec(html)) !== null) {
    const type = m[1];
    const code = m[3];
    const displayUri = m[4].replace(/\\/g, '').replace(/&amp;/g, '&');

    const isVideo = type === 'XIGPolarisVideoMedia';
    const itemUrl = isVideo ? `https://www.instagram.com/reel/${code}/` : `https://www.instagram.com/p/${code}/`;

    itemsMap.set(code, {
      id: code,
      title: isVideo ? `Instagram Reel (${code})` : `Instagram Post (${code})`,
      url: itemUrl,
      thumbnailUrl: displayUri,
      directDownloadUrl: isVideo ? undefined : displayUri,
      mediaType: isVideo ? 'reel' : 'image',
      author: displayName,
    });
  }

  // Extract Story Highlights from SSR
  const hlRegex = /"id":"(\d+)","title":"([^"]+)","cover_media_cropped_thumbnail_url":"([^"]+)"/g;
  let hm;
  while ((hm = hlRegex.exec(html)) !== null) {
    const hId = hm[1];
    const hTitle = decodeHtmlEntities(hm[2]);
    const hCover = hm[3].replace(/\\/g, '').replace(/&amp;/g, '&');
    const hKey = `highlight_${hId}`;
    if (!itemsMap.has(hKey)) {
      itemsMap.set(hKey, {
        id: hKey,
        title: `Highlight: ${hTitle}`,
        url: `https://www.instagram.com/stories/highlights/${hId}/`,
        thumbnailUrl: hCover,
        directDownloadUrl: hCover,
        mediaType: 'highlight',
        author: displayName,
      });
    }
  }

  // Also query stories endpoint if session cookie or public
  try {
    const storiesRes = await axios.get(`https://www.instagram.com/stories/${cleanUsername}/`, {
      headers: desktopHeaders,
      timeout: 6000,
    });
    const sData = String(storiesRes.data || '');
    if (!sData.includes('login_form') && sData.includes('story')) {
      const storyMediaRegex = /"(https:\/\/[^"]*?scontent[^"]*?cdninstagram\.com[^"]*?)"/g;
      let sm;
      while ((sm = storyMediaRegex.exec(sData)) !== null) {
        const sUrl = sm[1].replace(/\\/g, '').replace(/&amp;/g, '&');
        if (!sUrl.includes('profile_pic') && !sUrl.includes('s150x150')) {
          const sId = `story_${itemsMap.size + 1}`;
          if (!itemsMap.has(sId)) {
            itemsMap.set(sId, {
              id: sId,
              title: `Instagram Story (@${cleanUsername})`,
              url: `https://www.instagram.com/stories/${cleanUsername}/`,
              thumbnailUrl: sUrl,
              directDownloadUrl: sUrl,
              mediaType: 'story',
              author: displayName,
            });
            break;
          }
        }
      }
    }
  } catch {
    // optional stories fetch
  }

  // 3. Fallback: If 0 items found via SSR, attempt yt-dlp
  if (itemsMap.size === 0 && (!isPrivate || options.sessionCookie)) {
    try {
      const ytdlpOptions: Record<string, any> = {
        dumpSingleJson: true,
        flatPlaylist: true,
        playlistEnd: options.limit || 24,
        skipDownload: true,
        noWarnings: true,
      };
      if (options.sessionCookie) {
        ytdlpOptions.addHeader = [
          desktopHeaders['Cookie'] ? `Cookie: ${desktopHeaders['Cookie']}` : `Cookie: sessionid=${options.sessionCookie}`,
        ];
      }

      const rawData: any = await youtubedl(profileUrl, ytdlpOptions);
      if (Array.isArray(rawData.entries) && rawData.entries.length > 0) {
        for (const e of rawData.entries) {
          if (!e) continue;
          const shortcode = e.id || '';
          const itemUrl = e.url || `https://www.instagram.com/p/${shortcode}/`;
          const isVideo = !!(e.duration && e.duration > 0);

          itemsMap.set(shortcode, {
            id: shortcode,
            title: e.title || `Instagram post by @${cleanUsername}`,
            url: itemUrl,
            thumbnailUrl: e.thumbnail || (Array.isArray(e.thumbnails) ? e.thumbnails[0]?.url : undefined),
            mediaType: isVideo ? (e.duration <= 90 ? 'reel' : 'video') : 'image',
            duration: e.duration,
            author: displayName,
          });
        }
      }
    } catch {
      // yt-dlp fallback finished
    }
  }

  const items = Array.from(itemsMap.values());

  const profile: UserProfileInfo = {
    platform: 'instagram',
    id: profileId,
    username: cleanUsername,
    displayName,
    avatarUrl,
    bio,
    followerCount,
    followingCount,
    mediaCount: mediaCount || items.length,
    isPrivate,
    isVerified,
    profileUrl,
  };

  return {
    profile,
    items,
    hasMore: false,
    warning: isPrivate
      ? 'This Instagram profile is private. Paste your Instagram session cookie (sessionid) in the unlock box above to view private posts and stories.'
      : undefined,
  };
}
