import youtubedl from 'yt-dlp-exec';
import { ProfileFetchOptions, ProfileFetchResult, ProfileMediaItem, UserProfileInfo } from '../types';
import { formatDuration } from '@/lib/media/formatter';

export async function fetchYouTubeProfile(
  options: ProfileFetchOptions,
  normalizedUrl: string,
  isPlaylist: boolean
): Promise<ProfileFetchResult> {
  const limit = options.limit || 24;
  const cursor = typeof options.cursor === 'number' ? options.cursor : parseInt(String(options.cursor || '1'), 10) || 1;
  const startIndex = Math.max(1, cursor);
  const endIndex = startIndex + limit - 1;

  // If it's a channel without specific tab, append /videos if not playlist
  let targetUrl = normalizedUrl;
  if (!isPlaylist && !targetUrl.includes('/videos') && !targetUrl.includes('/shorts') && !targetUrl.includes('/streams')) {
    targetUrl = targetUrl.replace(/\/+$/, '') + '/videos';
  }

  const ytdlpOptions: Record<string, any> = {
    dumpSingleJson: true,
    flatPlaylist: true,
    playlistStart: startIndex,
    playlistEnd: endIndex + 1, // +1 to check hasMore
    skipDownload: true,
    noWarnings: true,
    jsRuntimes: 'node',
  };

  let rawData: any;
  try {
    rawData = await youtubedl(targetUrl, ytdlpOptions);
  } catch (err: any) {
    // If /videos failed, retry base URL (e.g. for user channels or playlists)
    if (targetUrl.includes('/videos')) {
      try {
        rawData = await youtubedl(normalizedUrl, ytdlpOptions);
      } catch (retryErr: any) {
        throw new Error(retryErr.message || 'Could not fetch YouTube channel or playlist.');
      }
    } else {
      throw new Error(err.message || 'Could not fetch YouTube channel or playlist.');
    }
  }

  const channelTitle = rawData.channel || rawData.uploader || rawData.title || 'YouTube Channel';
  const channelId = rawData.channel_id || rawData.channel_url || rawData.id || '';
  const channelUrl = rawData.channel_url || normalizedUrl;

  // Best avatar thumbnail
  let avatarUrl: string | undefined;
  if (Array.isArray(rawData.thumbnails) && rawData.thumbnails.length > 0) {
    const sorted = [...rawData.thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
    avatarUrl = sorted[0]?.url;
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
        : `https://www.youtube.com/watch?v=${vidId}`;

      let thumb = e.thumbnail;
      if (!thumb && Array.isArray(e.thumbnails) && e.thumbnails.length > 0) {
        thumb = e.thumbnails[e.thumbnails.length - 1].url;
      }
      if (!thumb && vidId) {
        thumb = `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
      }

      const dur = typeof e.duration === 'number' ? Math.round(e.duration) : undefined;
      const isReel = dur !== undefined && dur <= 60;

      return {
        id: vidId,
        title: e.title || 'YouTube Video',
        url: videoUrl,
        thumbnailUrl: thumb,
        mediaType: isReel ? 'reel' : 'video',
        duration: dur,
        durationFormatted: dur ? formatDuration(dur) : undefined,
        viewCount: e.view_count,
        uploadDate: e.upload_date,
        description: e.description,
        author: channelTitle,
      };
    });

  const profile: UserProfileInfo = {
    platform: 'youtube',
    id: channelId,
    username: rawData.uploader_id || rawData.channel || channelTitle,
    displayName: channelTitle,
    avatarUrl: avatarUrl || (items[0]?.thumbnailUrl),
    bio: rawData.description,
    followerCount: rawData.channel_follower_count || undefined,
    mediaCount: rawData.playlist_count || (items.length >= limit ? undefined : items.length),
    isPrivate: false,
    profileUrl: channelUrl,
  };

  return {
    profile,
    items,
    nextCursor: hasMore ? startIndex + limit : undefined,
    hasMore,
    totalAvailable: rawData.playlist_count,
  };
}
