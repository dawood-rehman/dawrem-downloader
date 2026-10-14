import { PlatformHandler, MediaAnalysisResult } from './types';
import { getMediaMetadataWithYtDlp, extractAvailableFormats } from './ytdl-helper';
import { formatDuration } from '../media/formatter';

export class YouTubeHandler implements PlatformHandler {
  public readonly platformId = 'youtube' as const;
  public readonly platformName = 'YouTube';

  public canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
      return host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com');
    } catch {
      return false;
    }
  }

  public async analyze(url: string): Promise<MediaAnalysisResult> {
    let normalizedUrl = url.trim();

    // 1. Detect if it's a Shorts URL or youtu.be short URL
    let videoId: string | null = null;
    const isShort = normalizedUrl.includes('/shorts/');

    try {
      const parsed = new URL(normalizedUrl);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');

      if (host === 'youtu.be') {
        videoId = parsed.pathname.replace(/^\//, '').split('/')[0];
      } else if (parsed.pathname.includes('/shorts/')) {
        const parts = parsed.pathname.split('/shorts/')[1];
        videoId = parts ? parts.split('/')[0] : null;
      } else if (parsed.searchParams.has('v')) {
        videoId = parsed.searchParams.get('v');
      }

      // If video ID found, normalize to clean canonical watch URL without tracking parameters
      if (videoId && /^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
        normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }
    } catch {}

    const data = await getMediaMetadataWithYtDlp(normalizedUrl);
    const availableFormats = extractAvailableFormats(data);
    const duration = data.duration || 0;

    return {
      id: data.id || videoId || `yt-${Date.now()}`,
      url: data.webpage_url || normalizedUrl,
      platform: this.platformId,
      platformName: this.platformName,
      title: data.title || (isShort ? 'YouTube Short' : 'YouTube Media'),
      thumbnail: data.thumbnail || '',
      author: data.uploader || data.channel || 'YouTube Creator',
      duration,
      formattedDuration: formatDuration(duration),
      supportsWatermarkRemoval: isShort, // Shorts support watermark removal
      availableFormats,
    };
  }
}

export const youtubeHandler = new YouTubeHandler();
