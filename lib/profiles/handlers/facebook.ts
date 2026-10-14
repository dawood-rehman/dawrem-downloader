import axios from 'axios';
import { ProfileFetchOptions, ProfileFetchResult, ProfileMediaItem, UserProfileInfo } from '../types';

/**
 * Cleanly decodes HTML entities (including emojis like &#x1fae0; and symbols)
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
    .replace(/&#xb7;/g, '·')
    .replace(/&#x200f;|&#x200e;/g, '')
    .trim();
}

/**
 * Transforms Facebook CDN thumbnail URL to full HD (1080p) direct URL
 */
function toHighResUrl(url: string): string {
  if (!url) return '';
  return url
    .replace(/\\/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&ctp=s(?:160x160|206x206|150x150|320x320|50x50)/g, '&ctp=s1080x1080')
    .replace(/&stp=dst-jpg_s(?:160x160|206x206|150x150|320x320)/g, '&stp=dst-jpg_s1080x1080');
}

export async function fetchFacebookProfile(
  options: ProfileFetchOptions
): Promise<ProfileFetchResult> {
  let cleanUsername = options.query
    .replace(/^https?:\/\/(?:www\.|m\.)?facebook\.com\//i, '')
    .replace(/^\/?@?/, '')
    .trim();

  // Handle profile.php?id=...
  if (cleanUsername.includes('id=')) {
    const idMatch = cleanUsername.match(/id=(\d+)/);
    if (idMatch) {
      cleanUsername = idMatch[1];
    }
  } else {
    cleanUsername = cleanUsername.split('/')[0].split('?')[0].trim();
  }

  if (!cleanUsername) {
    throw new Error('Please provide a valid Facebook username, ID, or profile URL.');
  }

  const isNumericId = /^\d+$/.test(cleanUsername);
  const profileUrl = isNumericId
    ? `https://www.facebook.com/profile.php?id=${cleanUsername}`
    : `https://www.facebook.com/${cleanUsername}`;
  const mobileUrl = isNumericId
    ? `https://m.facebook.com/profile.php?id=${cleanUsername}&hpir=1`
    : `https://m.facebook.com/${cleanUsername}?hpir=1`;
  const photosUrl = isNumericId
    ? `https://www.facebook.com/profile.php?id=${cleanUsername}&sk=photos`
    : `https://www.facebook.com/${cleanUsername}/photos`;
  const photosByUrl = isNumericId
    ? `https://www.facebook.com/profile.php?id=${cleanUsername}&sk=photos_by`
    : `https://www.facebook.com/${cleanUsername}/photos_by`;
  const photosAlbumsUrl = isNumericId
    ? `https://www.facebook.com/profile.php?id=${cleanUsername}&sk=photos_albums`
    : `https://www.facebook.com/${cleanUsername}/photos_albums`;
  const videosUrl = isNumericId
    ? `https://www.facebook.com/profile.php?id=${cleanUsername}&sk=videos`
    : `https://www.facebook.com/${cleanUsername}/videos`;
  const reelsUrl = isNumericId
    ? `https://www.facebook.com/profile.php?id=${cleanUsername}&sk=reels_tab`
    : `https://www.facebook.com/${cleanUsername}/reels`;
  const storiesUrl = `https://www.facebook.com/stories/${cleanUsername}`;

  // Complete desktop browser navigation headers
  const desktopHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };

  // Mobile fallback headers
  const mobileHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  if (options.sessionCookie) {
    desktopHeaders['Cookie'] = options.sessionCookie;
    mobileHeaders['Cookie'] = options.sessionCookie;
  } else {
    mobileHeaders['Cookie'] = 'm_pixel_ratio=2.0; wd=414x896';
  }

  // Concurrently query timeline, photos, photos_by, albums, videos, reels, stories, and mobile
  const targets = [
    { name: 'main', url: profileUrl, headers: desktopHeaders },
    { name: 'photos', url: photosUrl, headers: desktopHeaders },
    { name: 'photos_by', url: photosByUrl, headers: desktopHeaders },
    { name: 'photos_albums', url: photosAlbumsUrl, headers: desktopHeaders },
    { name: 'videos', url: videosUrl, headers: desktopHeaders },
    { name: 'reels', url: reelsUrl, headers: desktopHeaders },
    { name: 'stories', url: storiesUrl, headers: desktopHeaders },
    { name: 'mobile', url: mobileUrl, headers: mobileHeaders },
  ];

  const responses = await Promise.allSettled(
    targets.map((t) => axios.get(t.url, { headers: t.headers, timeout: 12000 }))
  );

  let combinedHtml = '';
  let mainHtml = '';
  let mobileHtml = '';
  let storiesHtml = '';

  responses.forEach((res, idx) => {
    if (res.status === 'fulfilled' && res.value?.data) {
      const data = String(res.value.data);
      combinedHtml += '\n' + data;
      if (targets[idx].name === 'main') mainHtml = data;
      if (targets[idx].name === 'mobile') mobileHtml = data;
      if (targets[idx].name === 'stories') storiesHtml = data;
    }
  });

  if (!combinedHtml.trim()) {
    throw new Error(`Facebook profile "${cleanUsername}" was not found or could not be loaded.`);
  }

  const metaSource = mainHtml.includes('og:title') ? mainHtml : mobileHtml;

  // 1. Profile Metadata
  const ogTitleMatch =
    metaSource.match(/<meta property="og:title" content="([^"]*)"/i) ||
    metaSource.match(/<meta content="([^"]*)" property="og:title"/i);
  const ogDescMatch =
    metaSource.match(/<meta property="og:description" content="([^"]*)"/i) ||
    metaSource.match(/<meta content="([^"]*)" property="og:description"/i);
  const ogImgMatch =
    metaSource.match(/<meta property="og:image" content="([^"]*)"/i) ||
    metaSource.match(/<meta content="([^"]*)" property="og:image"/i);
  const alUrlMatch = combinedHtml.match(/<meta property="al:android:url" content="([^"]*)"/i);

  const displayName = ogTitleMatch
    ? decodeHtmlEntities(ogTitleMatch[1])
    : cleanUsername;

  const rawBio = ogDescMatch
    ? decodeHtmlEntities(ogDescMatch[1])
    : undefined;

  const avatarUrl = ogImgMatch
    ? toHighResUrl(ogImgMatch[1])
    : undefined;

  let fbid = cleanUsername;
  if (alUrlMatch) {
    const idExtract = alUrlMatch[1].match(/fb:\/\/(?:profile|page)\/(\d+)/);
    if (idExtract) fbid = idExtract[1];
  }

  // 2. Verified Blue Tick Detection (Precision Scoped)
  let isVerified = false;
  if (combinedHtml.includes('"show_verified_badge_on_profile":true')) {
    isVerified = true;
  } else if (combinedHtml.includes('"show_verified_badge_on_profile":false')) {
    isVerified = false;
  } else {
    // Scoped fallback only when explicit flag is absent
    isVerified =
      combinedHtml.includes('aria-label="Verified account"') ||
      combinedHtml.includes('aria-label="Verified profile"') ||
      combinedHtml.includes('aria-label="Verified Page"') ||
      combinedHtml.includes('"verification_status":"blue_verified"');
  }

  // Follower count parsing
  let followerCount: number | undefined;
  if (rawBio) {
    const folMatch = rawBio.match(/([0-9,]+)\s+followers/i);
    if (folMatch) {
      followerCount = parseInt(folMatch[1].replace(/,/g, ''), 10);
    }
  }

  // 3. Direct Native Video & Reel Streams Extraction (.mp4 URLs)
  const videoStreamsMap = new Map<string, string>();
  const streamRegex = /"browser_native_(?:hd|sd)_url":"([^"]+)".*?"id":"(\d+)"/g;
  let sMatch;
  while ((sMatch = streamRegex.exec(combinedHtml)) !== null) {
    const rawStream = sMatch[1].replace(/\\/g, '').replace(/&amp;/g, '&');
    const vId = sMatch[2];
    if (rawStream && rawStream.startsWith('http') && !videoStreamsMap.has(vId)) {
      videoStreamsMap.set(vId, rawStream);
    }
  }

  const playableRegex = /"playable_url(?:_quality_hd)?":"([^"]+)".*?"id":"(\d+)"/g;
  let pMatch;
  while ((pMatch = playableRegex.exec(combinedHtml)) !== null) {
    const rawStream = pMatch[1].replace(/\\/g, '').replace(/&amp;/g, '&');
    const vId = pMatch[2];
    if (rawStream && rawStream.startsWith('http') && !videoStreamsMap.has(vId)) {
      videoStreamsMap.set(vId, rawStream);
    }
  }

  // 4. Media Items Extraction (Photos, Reels, Videos, Stories, Highlights)
  const itemsMap = new Map<string, ProfileMediaItem>();

  // Extract scontent photo & reel CDN nodes across all Meta CDN prefixes
  const scontentMatches = [
    ...combinedHtml.matchAll(
      /"(https:\/\/[^"]*?scontent[^"]*?(?:t\d+\.[\d-]+)[^"]*?)"/g
    ),
  ];

  for (const m of scontentMatches) {
    const rawUrl = m[1].replace(/\\/g, '').replace(/&amp;/g, '&');
    const idMatch = rawUrl.match(/(?:t\d+\.[\d-]+)\/(?:\d+_)?(\d+)_\d+/);
    const mediaId = idMatch ? idMatch[1] : null;

    if (!mediaId) continue;

    // Check if it's the tiny avatar image
    const isTinyAvatar = rawUrl.includes('t39.30808-1') && (rawUrl.includes('s40x40') || rawUrl.includes('s50x50'));
    if (isTinyAvatar) continue;

    const isVideoOrReel = rawUrl.includes('t15.');
    const existing = itemsMap.get(mediaId);

    const highResUrl = toHighResUrl(rawUrl);
    const isHighRes =
      highResUrl.includes('1080x1080') ||
      highResUrl.includes('2048x') ||
      (!highResUrl.includes('s206x206') && !highResUrl.includes('s160x160') && !highResUrl.includes('s150x150'));

    const directStream = isVideoOrReel ? (videoStreamsMap.get(mediaId) || highResUrl) : highResUrl;

    if (!existing || (isHighRes && !existing.thumbnailUrl?.includes('1080x1080'))) {
      itemsMap.set(mediaId, {
        id: mediaId,
        title: isVideoOrReel
          ? `Facebook Reel (${mediaId})`
          : `Facebook Photo (${mediaId})`,
        url: isVideoOrReel
          ? `https://www.facebook.com/reel/${mediaId}`
          : `https://www.facebook.com/photo/?fbid=${mediaId}`,
        thumbnailUrl: highResUrl,
        directDownloadUrl: directStream,
        mediaType: isVideoOrReel ? 'reel' : 'image',
        author: displayName,
      });
    }
  }

  // Extract video & reel links from page anchors
  const videoMatches = [
    ...combinedHtml.matchAll(
      /"(https:\/\/(?:www\.|m\.)?facebook\.com\/[^"]*?\/(?:videos|reel)\/(\d+)[^"]*?)"/g
    ),
  ];

  for (const m of videoMatches) {
    const vUrl = m[1].replace(/\\/g, '').replace(/&amp;/g, '&');
    const vId = m[2];
    if (!itemsMap.has(vId)) {
      const isReel = vUrl.includes('/reel/');
      const directStream = videoStreamsMap.get(vId);
      itemsMap.set(vId, {
        id: vId,
        title: isReel ? `Facebook Reel (${vId})` : `Facebook Video (${vId})`,
        url: vUrl,
        thumbnailUrl: avatarUrl,
        directDownloadUrl: directStream,
        mediaType: isReel ? 'reel' : 'video',
        author: displayName,
      });
    }
  }

  // Extract active story items if present
  if (storiesHtml && !storiesHtml.includes('login_form')) {
    const storyMediaMatches = [
      ...storiesHtml.matchAll(
        /"(https:\/\/[^"]*?scontent[^"]*?(?:t\d+\.[\d-]+)[^"]*?)"/g
      ),
    ];
    for (const sm of storyMediaMatches) {
      const sUrl = toHighResUrl(sm[1]);
      const sIdMatch = sUrl.match(/(?:t\d+\.[\d-]+)\/(?:\d+_)?(\d+)_\d+/);
      const sId = sIdMatch ? `story_${sIdMatch[1]}` : null;
      if (sId && !itemsMap.has(sId)) {
        itemsMap.set(sId, {
          id: sId,
          title: `Facebook Story (${displayName})`,
          url: `https://www.facebook.com/stories/${cleanUsername}`,
          thumbnailUrl: sUrl,
          directDownloadUrl: sUrl,
          mediaType: 'story',
          author: displayName,
        });
      }
    }
  }

  // Extract story buckets from SSR
  const storyBucketRegex = /"bucket_id":"(\d+)"[^}]*?"uri":"([^"]+)"/g;
  let stMatch;
  while ((stMatch = storyBucketRegex.exec(combinedHtml)) !== null) {
    const bId = stMatch[1];
    const sUri = toHighResUrl(stMatch[2]);
    const sKey = `story_${bId}`;
    if (!itemsMap.has(sKey)) {
      itemsMap.set(sKey, {
        id: sKey,
        title: `Facebook Story (${displayName})`,
        url: `https://www.facebook.com/stories/${cleanUsername}`,
        thumbnailUrl: sUri,
        directDownloadUrl: sUri,
        mediaType: 'story',
        author: displayName,
      });
    }
  }

  // Extract featured collections / highlights if present
  const highlightRegex = /"highlight_id":"(\d+)"[^}]*?"uri":"([^"]+)"/g;
  let hm;
  while ((hm = highlightRegex.exec(combinedHtml)) !== null) {
    const hId = hm[1];
    const hThumb = toHighResUrl(hm[2]);
    const hKey = `highlight_${hId}`;
    if (!itemsMap.has(hKey)) {
      itemsMap.set(hKey, {
        id: hKey,
        title: `Facebook Story Highlight (${hId})`,
        url: profileUrl,
        thumbnailUrl: hThumb,
        directDownloadUrl: hThumb,
        mediaType: 'highlight',
        author: displayName,
      });
    }
  }

  const items = Array.from(itemsMap.values());

  // Check login wall (private or locked profile)
  const isLoginPage =
    combinedHtml.includes('login_form') ||
    combinedHtml.includes('id="login_top_banner"') ||
    combinedHtml.includes('Log In to Facebook') ||
    combinedHtml.includes('You must log in to continue') ||
    combinedHtml.includes('locked their profile') ||
    combinedHtml.includes('Only friends can see what they share');

  const isPrivate = isLoginPage && items.length === 0;

  const profile: UserProfileInfo = {
    platform: 'facebook',
    id: fbid,
    username: cleanUsername,
    displayName,
    avatarUrl,
    bio: rawBio,
    followerCount,
    mediaCount: items.length,
    isPrivate,
    isVerified,
    profileUrl,
  };

  return {
    profile,
    items,
    hasMore: false,
    warning: isPrivate
      ? 'This Facebook profile is private or locked. To view and download private content, paste your Facebook session cookie (c_user & xs) in the unlock box above.'
      : undefined,
  };
}
