import axios from 'axios';
import { alldl } from 'rahad-all-downloader-v2';
import { PlatformHandler, MediaAnalysisResult, MediaFormat, MediaItemPreview } from './types';
import { getMediaMetadataWithYtDlp, extractAvailableFormats } from './ytdl-helper';
import { formatBytes, formatDuration } from '../media/formatter';

export class TikTokHandler implements PlatformHandler {
  public readonly platformId = 'tiktok' as const;
  public readonly platformName = 'TikTok';

  public canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
      return (
        host === 'tiktok.com' ||
        host.endsWith('.tiktok.com') ||
        host === 'vt.tiktok.com' ||
        host === 'vm.tiktok.com'
      );
    } catch {
      return false;
    }
  }

  public async analyze(url: string): Promise<MediaAnalysisResult> {
    // 1. Attempt alldl first (direct clean CDN video stream without login)
    try {
      const rahadRes = await alldl(url);
      if (rahadRes && rahadRes.data && rahadRes.data.videoUrl) {
        const info = rahadRes.data;
        const formats: MediaFormat[] = [
          {
            formatId: 'tiktok-nowm-hd',
            label: 'No Watermark (HD MP4)',
            type: 'video',
            extension: 'mp4',
            quality: 'HD 1080p',
            hasWatermark: false,
            supportsWatermarkRemoval: true,
            directDownloadUrl: info.videoUrl,
          },
          {
            formatId: 'tiktok-nowm',
            label: 'No Watermark (Standard MP4)',
            type: 'video',
            extension: 'mp4',
            quality: '720p',
            hasWatermark: false,
            supportsWatermarkRemoval: true,
            directDownloadUrl: info.videoUrl,
          },
          {
            formatId: 'audio-mp3',
            label: 'Audio Track (MP3)',
            type: 'audio',
            extension: 'mp3',
            quality: 'Original Sound',
            hasWatermark: false,
            supportsWatermarkRemoval: false,
            directDownloadUrl: info.videoUrl,
          },
        ];

        return {
          id: `tiktok-${Date.now()}`,
          url,
          platform: this.platformId,
          platformName: this.platformName,
          title: info.title || 'TikTok Video',
          thumbnail: '',
          author: 'TikTok Creator',
          duration: 30,
          formattedDuration: '00:30',
          supportsWatermarkRemoval: true,
          availableFormats: formats,
        };
      }
    } catch (alldlErr) {
      console.warn('[TIKTOK_ALLDL_WARN] alldl extraction failed, attempting TikWM fallback:', (alldlErr as Error).message);
    }

    // 2. Attempt TikWM public API for direct watermark-free metadata & slideshows
    try {
      const response = await axios.get('https://www.tikwm.com/api/', {
        params: { url },
        timeout: 8000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (response.data && response.data.code === 0 && response.data.data) {
        const item = response.data.data;
        const duration = item.duration || 0;
        const formats: MediaFormat[] = [];
        let isCarousel = false;
        const carouselItems: MediaItemPreview[] = [];

        // Check if it's an image slideshow post
        if (Array.isArray(item.images) && item.images.length > 0) {
          isCarousel = true;
          item.images.forEach((imgUrl: string, idx: number) => {
            const fullUrl = imgUrl.startsWith('http') ? imgUrl : `https://www.tikwm.com${imgUrl}`;
            carouselItems.push({
              id: `slide-${idx + 1}`,
              type: 'image',
              url: fullUrl,
              thumbnail: fullUrl,
            });

            formats.push({
              formatId: `tiktok-slide-${idx + 1}`,
              label: `Photo Slide ${idx + 1} (Full HD JPG)`,
              type: 'image',
              extension: 'jpg',
              quality: 'HD Image',
              directDownloadUrl: fullUrl,
              supportsWatermarkRemoval: false,
            });
          });
        }

        // Standard or HD Video streams if available
        if (item.play) {
          formats.unshift(
            {
              formatId: 'tiktok-nowm-hd',
              label: 'No Watermark (HD MP4)',
              type: 'video',
              extension: 'mp4',
              quality: 'HD 1080p',
              fileSizeEstimate: item.size ? formatBytes(item.size) : undefined,
              hasWatermark: false,
              supportsWatermarkRemoval: true,
              directDownloadUrl: item.hdplay
                ? item.hdplay.startsWith('http')
                  ? item.hdplay
                  : `https://www.tikwm.com${item.hdplay}`
                : item.play.startsWith('http')
                ? item.play
                : `https://www.tikwm.com${item.play}`,
            },
            {
              formatId: 'tiktok-nowm',
              label: 'No Watermark (Standard MP4)',
              type: 'video',
              extension: 'mp4',
              quality: '720p',
              fileSizeEstimate: item.size ? formatBytes(item.size) : undefined,
              hasWatermark: false,
              supportsWatermarkRemoval: true,
              directDownloadUrl: item.play.startsWith('http') ? item.play : `https://www.tikwm.com${item.play}`,
            }
          );

          if (item.wmplay) {
            formats.push({
              formatId: 'tiktok-wm',
              label: 'Original with Watermark (MP4)',
              type: 'video',
              extension: 'mp4',
              quality: 'Standard',
              fileSizeEstimate: item.wm_size ? formatBytes(item.wm_size) : undefined,
              hasWatermark: true,
              supportsWatermarkRemoval: true,
              directDownloadUrl: item.wmplay.startsWith('http') ? item.wmplay : `https://www.tikwm.com${item.wmplay}`,
            });
          }
        }

        // Audio Track
        if (item.music) {
          formats.push({
            formatId: 'audio-mp3',
            label: 'Audio Track (MP3)',
            type: 'audio',
            extension: 'mp3',
            quality: 'Original Sound',
            hasWatermark: false,
            supportsWatermarkRemoval: false,
            directDownloadUrl: item.music.startsWith('http') ? item.music : `https://www.tikwm.com${item.music}`,
          });
        }

        const thumbnail = item.cover
          ? item.cover.startsWith('http')
            ? item.cover
            : `https://www.tikwm.com${item.cover}`
          : carouselItems[0]?.thumbnail || '';

        return {
          id: item.id || `tiktok-${Date.now()}`,
          url,
          platform: this.platformId,
          platformName: this.platformName,
          title: item.title || (isCarousel ? 'TikTok Image Slideshow' : 'TikTok Video'),
          thumbnail,
          author: item.author?.unique_id ? `@${item.author.unique_id}` : item.author?.nickname || 'TikTok User',
          authorAvatar: item.author?.avatar
            ? item.author.avatar.startsWith('http')
              ? item.author.avatar
              : `https://www.tikwm.com${item.author.avatar}`
            : undefined,
          duration,
          formattedDuration: formatDuration(duration),
          supportsWatermarkRemoval: !isCarousel,
          availableFormats: formats,
          isCarousel,
          carouselItems: isCarousel ? carouselItems : undefined,
        };
      }
    } catch (e) {
      console.warn('[TIKTOK_API_FALLBACK] Falling back to yt-dlp:', (e as Error).message);
    }

    // 3. Fallback to yt-dlp engine
    const data = await getMediaMetadataWithYtDlp(url);
    const availableFormats = extractAvailableFormats(data).map((fmt) => ({
      ...fmt,
      supportsWatermarkRemoval: true,
    }));
    const duration = data.duration || 0;

    return {
      id: data.id || `tiktok-${Date.now()}`,
      url: data.webpage_url || url,
      platform: this.platformId,
      platformName: this.platformName,
      title: data.title || 'TikTok Video',
      thumbnail: data.thumbnail || '',
      author: data.uploader || 'TikTok User',
      duration,
      formattedDuration: formatDuration(duration),
      supportsWatermarkRemoval: true,
      availableFormats,
    };
  }
}

export const tikTokHandler = new TikTokHandler();
