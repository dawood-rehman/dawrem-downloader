import axios from 'axios';
import { ProfileFetchOptions, ProfileFetchResult, ProfileMediaItem, UserProfileInfo } from '../types';

export async function fetchPinterestProfile(
  options: ProfileFetchOptions
): Promise<ProfileFetchResult> {
  const cleanUsername = options.query
    .replace(/^https?:\/\/(?:www\.)?pinterest\.[a-z.]+\//i, '')
    .replace(/^\/?@?/, '')
    .split('/')[0]
    .trim();

  if (!cleanUsername) {
    throw new Error('Please provide a valid Pinterest username or profile URL.');
  }

  const profilePageUrl = `https://www.pinterest.com/${cleanUsername}/`;
  const rssUrl = `https://www.pinterest.com/${cleanUsername}/feed.rss`;

  let displayName = cleanUsername;
  let bio: string | undefined;
  let avatarUrl: string | undefined;

  // 1. Fetch profile metadata from HTML headers
  try {
    const htmlRes = await axios.get(profilePageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 8000,
    });
    const html = htmlRes.data;

    const ogTitleMatch = html.match(/<meta [^>]*property="og:title" [^>]*content="([^"]*)"/i) ||
      html.match(/<meta [^>]*content="([^"]*)" [^>]*property="og:title"/i);
    if (ogTitleMatch) {
      displayName = ogTitleMatch[1].replace(/\s*\([^)]*\)\s*-\s*Profile\s*\|\s*Pinterest/i, '').trim();
    }

    const ogDescMatch = html.match(/<meta [^>]*property="og:description" [^>]*content="([^"]*)"/i) ||
      html.match(/<meta [^>]*content="([^"]*)" [^>]*property="og:description"/i);
    if (ogDescMatch) {
      bio = ogDescMatch[1].replace(/^[^|]+\|\s*/, '').trim();
    }

    const ogImgMatch = html.match(/<meta [^>]*property="og:image" [^>]*content="([^"]*)"/i) ||
      html.match(/<meta [^>]*content="([^"]*)" [^>]*property="og:image"/i);
    if (ogImgMatch && !ogImgMatch[1].includes('default_open_graph')) {
      avatarUrl = ogImgMatch[1];
    }
  } catch {
    // Continue even if HTML fetch throttles
  }

  // 2. Fetch pins from public RSS feed
  let rssText = '';
  try {
    const rssRes = await axios.get(rssUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 8000,
    });
    rssText = rssRes.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      throw new Error(`Pinterest user "@${cleanUsername}" was not found.`);
    }
    throw new Error('Unable to fetch Pinterest pins. Profile may be private or unavailable.');
  }

  // Parse RSS XML items
  const items: ProfileMediaItem[] = [];
  const itemBlocks = rssText.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const block of itemBlocks) {
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const guidMatch = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);

    const link = linkMatch ? linkMatch[1].trim() : '';
    const pinId = guidMatch
      ? guidMatch[1].split('/').filter(Boolean).pop() || ''
      : link.split('/').filter(Boolean).pop() || '';

    // Extract image URL from description: <img src="...">
    const rawDesc = descMatch
      ? descMatch[1]
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
      : '';
    const imgMatch = rawDesc.match(/src="([^"]+)"/);
    let thumbUrl = imgMatch ? imgMatch[1] : undefined;
    let originalImgUrl = thumbUrl;

    if (thumbUrl && thumbUrl.includes('/236x/')) {
      originalImgUrl = thumbUrl.replace('/236x/', '/originals/');
      thumbUrl = thumbUrl.replace('/236x/', '/736x/'); // High-res for UI preview
    }

    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : 'Pinterest Pin';

    if (pinId && (thumbUrl || link)) {
      items.push({
        id: pinId,
        title: title || `Pin ${pinId}`,
        url: link || `https://www.pinterest.com/pin/${pinId}/`,
        thumbnailUrl: thumbUrl,
        directDownloadUrl: originalImgUrl || thumbUrl,
        mediaType: 'pin',
        uploadDate: pubDateMatch ? pubDateMatch[1] : undefined,
        description: title,
        author: displayName,
      });
    }
  }

  const profile: UserProfileInfo = {
    platform: 'pinterest',
    id: cleanUsername,
    username: cleanUsername,
    displayName,
    avatarUrl: avatarUrl || items[0]?.thumbnailUrl,
    bio,
    mediaCount: items.length,
    isPrivate: false,
    profileUrl: profilePageUrl,
  };

  return {
    profile,
    items,
    hasMore: false,
  };
}
