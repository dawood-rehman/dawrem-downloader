import axios from 'axios';
import { PlatformHandler, MediaAnalysisResult, MediaFormat, MediaItemPreview } from './types';
import { getMediaMetadataWithYtDlp, extractAvailableFormats } from './ytdl-helper';
import { formatDuration } from '../media/formatter';
import { PrivateContentError } from '../errors/downloader-errors';

export class InstagramHandler implements PlatformHandler {
  public readonly platformId = 'instagram' as const;
  public readonly platformName = 'Instagram';

  public canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
      return host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am';
    } catch {
      return false;
    }
  }

  public async analyze(url: string): Promise<MediaAnalysisResult> {
    // 1. Instagram Stories Check: Explicit ephemeral content detection
    if (url.includes('/stories/')) {
      throw new PrivateContentError(
        'Instagram Stories are ephemeral (expire in 24 hours) and require an active user login. DAWREM supports public Instagram Reels and Posts.'
      );
    }

    // 2. Attempt yt-dlp first (handles public Reels and video posts)
    try {
      const data = await getMediaMetadataWithYtDlp(url);
      const availableFormats = extractAvailableFormats(data);
      const duration = data.duration || 0;

      let isCarousel = false;
      const carouselItems: MediaItemPreview[] = [];

      // Check for carousel entries
      const anyData = data as any;
      if (Array.isArray(anyData.entries) && anyData.entries.length > 1) {
        isCarousel = true;
        anyData.entries.forEach((item: any, idx: number) => {
          carouselItems.push({
            id: item.id || `item-${idx}`,
            type: item.vcodec && item.vcodec !== 'none' ? 'video' : 'image',
            url: item.url || item.webpage_url,
            thumbnail: item.thumbnail,
          });
        });
      }

      return {
        id: data.id || `ig-${Date.now()}`,
        url: data.webpage_url || url,
        platform: this.platformId,
        platformName: this.platformName,
        title: data.title || (data.description ? data.description.slice(0, 80) : 'Instagram Media'),
        thumbnail: data.thumbnail || '',
        author: data.uploader || 'Instagram User',
        duration,
        formattedDuration: formatDuration(duration),
        supportsWatermarkRemoval: true,
        availableFormats,
        isCarousel,
        carouselItems: isCarousel ? carouselItems : undefined,
      };
    } catch {
      // 3. Fallback: Attempt OpenGraph and HTML inspection for image posts
      const htmlResult = await this.tryScrapeInstagramPost(url);
      if (htmlResult) {
        return htmlResult;
      }

      // If both failed, provide informative Meta error message
      throw new PrivateContentError(
        "This Instagram media requires account login or is restricted by Meta's privacy settings. DAWREM supports public Instagram Reels and Posts."
      );
    }
  }

  /**
   * Scrapes public Instagram post for images when yt-dlp receives empty media response.
   */
  private async tryScrapeInstagramPost(url: string): Promise<MediaAnalysisResult | null> {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 6000,
        maxRedirects: 5,
      });

      const html = typeof res.data === 'string' ? res.data : '';

      const ogImgMatch =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      const ogTitleMatch =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
      const ogVideoMatch =
        html.match(/<meta[^>]+property=["']og:video(:secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(:secure_url)?["']/i);

      const imageUrl = ogImgMatch ? ogImgMatch[1].replace(/&amp;/g, '&') : null;
      const videoUrl = ogVideoMatch ? (ogVideoMatch[2] || ogVideoMatch[1]).replace(/&amp;/g, '&') : null;

      if (imageUrl || videoUrl) {
        const formats: MediaFormat[] = [];

        if (videoUrl) {
          formats.push({
            formatId: 'ig-video-hd',
            label: 'HD Reel/Video (MP4)',
            type: 'video',
            extension: 'mp4',
            quality: 'HD 1080p',
            directDownloadUrl: videoUrl,
            supportsWatermarkRemoval: true,
            hasAudio: true,
          });

          formats.push({
            formatId: 'audio-mp3',
            label: 'Audio Track (MP3)',
            type: 'audio',
            extension: 'mp3',
            quality: '320 kbps',
            directDownloadUrl: videoUrl,
            supportsWatermarkRemoval: false,
          });

          formats.push({
            formatId: 'audio-m4a',
            label: 'Original Audio (M4A / AAC)',
            type: 'audio',
            extension: 'm4a',
            quality: 'High Quality AAC',
            directDownloadUrl: videoUrl,
            supportsWatermarkRemoval: false,
          });
        }

        if (imageUrl) {
          formats.push({
            formatId: 'ig-image-hd',
            label: 'Original High-Res Photo (JPG)',
            type: 'image',
            extension: 'jpg',
            quality: 'High Resolution',
            directDownloadUrl: imageUrl,
            supportsWatermarkRemoval: false,
          });
        }

        return {
          id: `ig-${Date.now()}`,
          url,
          platform: this.platformId,
          platformName: this.platformName,
          title: ogTitleMatch ? ogTitleMatch[1] : 'Instagram Media',
          thumbnail: imageUrl || '',
          author: 'Instagram User',
          duration: 0,
          formattedDuration: '00:00',
          supportsWatermarkRemoval: !!videoUrl,
          availableFormats: formats,
        };
      }
    } catch {
      // Scrape failed
    }

    return null;
  }
}

export const instagramHandler = new InstagramHandler();
