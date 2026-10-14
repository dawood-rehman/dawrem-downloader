import axios from 'axios';
import { PlatformHandler, MediaAnalysisResult, MediaFormat } from './types';
import { getMediaMetadataWithYtDlp, extractAvailableFormats } from './ytdl-helper';
import { formatDuration } from '../media/formatter';
import { MediaUnavailableError } from '../errors/downloader-errors';

export class PinterestHandler implements PlatformHandler {
  public readonly platformId = 'pinterest' as const;
  public readonly platformName = 'Pinterest';

  public canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
      return (
        host === 'pinterest.com' ||
        host.endsWith('.pinterest.com') ||
        host === 'pin.it' ||
        host.includes('pinterest.')
      );
    } catch {
      return false;
    }
  }

  public async analyze(url: string): Promise<MediaAnalysisResult> {
    // 1. Fast direct page extraction (handles both image pins and video pins in ~1-2 seconds)
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 7000,
        maxRedirects: 5,
      });

      const html = typeof res.data === 'string' ? res.data : '';

      // Pinterest embeds escaped URLs in JSON as well as ordinary HTML. Only
      // accept actual pinimg media paths; the old broad match also picked up
      // unrelated page artwork and invented /originals/ URLs that may not exist.
      const normalizedHtml = html
        .replace(/\\u002f/gi, '/')
        .replace(/\\\//g, '/')
        .replace(/&amp;/g, '&');
      const rawImages = Array.from(
        new Set(
          normalizedHtml.match(
            /https:\/\/i\.pinimg\.com\/(?:originals|736x|564x|474x|236x|1200x|600x)\/[^\s"'<>\\]+?\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>\\]*)?/gi
          ) || []
        )
      ).filter((imageUrl) => {
        try {
          const parsed = new URL(imageUrl);
          return parsed.hostname === 'i.pinimg.com' &&
            !/placeholder|default|no[-_]?image|avatar/i.test(parsed.pathname);
        } catch {
          return false;
        }
      });

      const originalImg = rawImages.find((u) => u.includes('/originals/'));
      const img736 = rawImages.find((u) => u.includes('/736x/'));
      const bestImg = originalImg || img736 || rawImages[0];

      // Check for videos
      const videoMatches =
        html.match(/https:\/\/v\.pinimg\.com\/videos\/[^\s"'<>]+\.mp4/gi) ||
        html.match(/https:\/\/[^"'\s<>]+\.(mp4|m3u8)/gi);
      const videoUrl = videoMatches ? videoMatches[0] : null;

      // Clean title from URL slug or path
      let title = 'Pinterest Pin';
      try {
        const finalUrl = res.request?.res?.responseUrl || url;
        const parsed = new URL(finalUrl);
        const segments = parsed.pathname.split('/').filter(Boolean);
        const pinIndex = segments.indexOf('pin');
        if (pinIndex !== -1 && segments[pinIndex + 1]) {
          const slug = decodeURIComponent(segments[pinIndex + 1]);
          if (!/^\d+$/.test(slug)) {
            title = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          } else {
            title = `Pinterest Pin #${slug}`;
          }
        }
      } catch {}

      if (bestImg || videoUrl) {
        const formats: MediaFormat[] = [];

        // If video pin
        if (videoUrl) {
          formats.push({
            formatId: 'pin-video-hd',
            label: 'HD Video (MP4)',
            type: 'video',
            extension: 'mp4',
            quality: 'HD 1080p',
            directDownloadUrl: videoUrl,
            supportsWatermarkRemoval: true,
            hasAudio: true,
          });
        }

        // If image pin or preview
        if (bestImg) {
          const ext = bestImg.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
          formats.push({
            formatId: 'pin-image-original',
            label: 'Original High-Res (Full Quality)',
            type: 'image',
            extension: ext,
            quality: 'Original Resolution',
            directDownloadUrl: bestImg,
            supportsWatermarkRemoval: false,
          });

          // Offer a second size only when Pinterest supplied that exact URL.
          if (img736 && img736 !== bestImg) {
            formats.push({
              formatId: 'pin-image-hd',
              label: 'Standard HD Image (736p)',
              type: 'image',
              extension: 'jpg',
              quality: '736p',
              directDownloadUrl: img736,
              supportsWatermarkRemoval: false,
            });
          }
        }

        return {
          id: `pin-${Date.now()}`,
          url,
          platform: this.platformId,
          platformName: this.platformName,
          title,
          thumbnail: bestImg || '',
          author: 'Pinterest Creator',
          duration: 0,
          formattedDuration: '00:00',
          supportsWatermarkRemoval: !!videoUrl,
          availableFormats: formats,
        };
      }
    } catch (directErr) {
      console.warn('[PINTEREST_DIRECT_WARN] Fast extraction failed, attempting fallback:', (directErr as Error).message);
    }

    // 2. Fallback to yt-dlp (in case of specialized video pins)
    try {
      const data = await getMediaMetadataWithYtDlp(url);
      const availableFormats = extractAvailableFormats(data);
      const duration = data.duration || 0;

      return {
        id: data.id || `pin-${Date.now()}`,
        url: data.webpage_url || url,
        platform: this.platformId,
        platformName: this.platformName,
        title: data.title || 'Pinterest Pin',
        thumbnail: data.thumbnail || '',
        author: data.uploader || 'Pinterest Creator',
        duration,
        formattedDuration: formatDuration(duration),
        supportsWatermarkRemoval: true,
        availableFormats,
      };
    } catch {
      throw new MediaUnavailableError('Pinterest media could not be retrieved. Please check if the pin is public.');
    }
  }
}

export const pinterestHandler = new PinterestHandler();
