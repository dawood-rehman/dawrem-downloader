import youtubedl from 'yt-dlp-exec';
import { ProfileFetchOptions, ProfileFetchResult, ProfileMediaItem, UserProfileInfo } from '../types';
import { formatDuration } from '@/lib/media/formatter';

export async function fetchTikTokProfile(
  options: ProfileFetchOptions,
  normalizedUrl: string
): Promise<ProfileFetchResult> {
  const limit = options.limit || 24;
  const cursor = typeof options.cursor === 'number' ? options.cursor : parseInt(String(options.cursor || '1'), 10) || 1;
  const startIndex = Math.max(1, cursor);
  const endIndex = startIndex + limit - 1;

  const ytdlpOptions: Record<string, any> = {
    dumpSingleJson: true,
    flatPlaylist: true,
    playlistStart: startIndex,
    playlistEnd: endIndex + 1,
    skipDownload: true,
    noWarnings: true,
  };

  let rawData: any;
  try {
    rawData = await youtubedl(normalizedUrl, ytdlpOptions);
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('user not found') || msg.includes('404')) {
      throw new Error(`TikTok user not found: ${normalizedUrl}`);
    }
    if (msg.includes('private') || msg.includes('login')) {
      return {
        profile: {
          platform: 'tiktok',
          id: options.query,
          username: options.query.replace(/^@/, ''),
          displayName: options.query.replace(/^@/, ''),
          profileUrl: normalizedUrl,
          isPrivate: true,
        },
        items: [],
        hasMore: false,
        warning: 'This TikTok profile is private or requires authentication to view posts.',
      };
    }
    throw new Error(err.message || 'Could not fetch TikTok profile.');
  }

  const username = rawData.uploader_id || rawData.uploader || rawData.title || options.query.replace(/^@/, '');
  const displayName = rawData.uploader || username;

  let avatarUrl: string | undefined;
  if (Array.isArray(rawData.thumbnails) && rawData.thumbnails.length > 0) {
    avatarUrl = rawData.thumbnails[rawData.thumbnails.length - 1]?.url;
  }

  const rawEntries: any[] = Array.isArray(rawData.entries) ? rawData.entries : [];
  const hasMore = rawEntries.length > limit;
  const slicedEntries = hasMore ? rawEntries.slice(0, limit) : rawEntries;

  const items: ProfileMediaItem[] = slicedEntries
    .filter((e) => e && (e.id || e.url))
    .map((e) => {
      const vidId = e.id || '';
      const videoUrl = e.url?.startsWith('http')
        ? e.url
        : `https://www.tiktok.com/@${username}/video/${vidId}`;

      let thumb = e.thumbnail;
      if (!thumb && Array.isArray(e.thumbnails) && e.thumbnails.length > 0) {
        thumb = e.thumbnails[e.thumbnails.length - 1].url;
      }

      const dur = typeof e.duration === 'number' ? Math.round(e.duration) : undefined;
      const isImage = dur === 0 || e.ext === 'jpg' || e.ext === 'png';

      return {
        id: vidId,
        title: e.title || `TikTok post by @${username}`,
        url: videoUrl,
        thumbnailUrl: thumb,
        mediaType: isImage ? 'image' : 'video',
        duration: dur,
        durationFormatted: dur ? formatDuration(dur) : undefined,
        viewCount: e.view_count,
        likeCount: e.like_count,
        uploadDate: e.upload_date,
        description: e.description,
        author: displayName,
      };
    });

  const profile: UserProfileInfo = {
    platform: 'tiktok',
    id: username,
    username,
    displayName,
    avatarUrl: avatarUrl || (items[0]?.thumbnailUrl),
    bio: rawData.description,
    followerCount: rawData.channel_follower_count,
    isPrivate: false,
    profileUrl: normalizedUrl,
  };

  return {
    profile,
    items,
    nextCursor: hasMore ? startIndex + limit : undefined,
    hasMore,
  };
}
