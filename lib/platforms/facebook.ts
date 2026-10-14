import axios from 'axios';
import { PlatformHandler, MediaAnalysisResult, MediaFormat } from './types';
import { getMediaMetadataWithYtDlp, extractAvailableFormats } from './ytdl-helper';
import { formatDuration } from '../media/formatter';
import { PrivateContentError } from '../errors/downloader-errors';

export class FacebookHandler implements PlatformHandler {
  public readonly platformId = 'facebook' as const;
  public readonly platformName = 'Facebook';

  public canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
      return (
        host === 'facebook.com' ||
        host.endsWith('.facebook.com') ||
        host === 'fb.watch' ||
        host === 'fb.com'
      );
    } catch {
      return false;
    }
  }

  public async analyze(url: string): Promise<MediaAnalysisResult> {
    // 0. Facebook Stories Check: Ephemeral content detection
    if (url.includes('/stories/')) {
      throw new PrivateContentError(
        'Facebook Stories are ephemeral (expire in 24 hours) and require an active user login. DAWREM supports public Facebook videos and reels.'
      );
    }

    const isExplicitPhotoUrl =
      url.includes('/photo') ||
      url.includes('/photos') ||
      url.includes('/share/p/') ||
      url.includes('photo.php') ||
      url.includes('fbid=');

    // 1. If it's an image/photo post, attempt HTML scraping first
    if (isExplicitPhotoUrl) {
      const photoResult = await this.tryScrapePhotoPost(url);
      if (photoResult) {
        return photoResult;
      }
    }

    // 2. Attempt video extraction via yt-dlp (works for Videos, Reels, and Watch links)
    try {
      const data = await getMediaMetadataWithYtDlp(url);
      const availableFormats = extractAvailableFormats(data);
      const duration = data.duration || 0;

      return {
        id: data.id || `fb-${Date.now()}`,
        url: data.webpage_url || url,
        platform: this.platformId,
        platformName: this.platformName,
        title: data.title || (data.description ? data.description.slice(0, 80) : 'Facebook Video'),
        thumbnail: data.thumbnail || '',
        author: data.uploader || 'Facebook User',
        duration,
        formattedDuration: formatDuration(duration),
        supportsWatermarkRemoval: true,
        availableFormats,
      };
    } catch (ytErr) {
      // If yt-dlp failed and we haven't tried photo scraping yet, try photo scraping now
      if (!isExplicitPhotoUrl) {
        const photoResult = await this.tryScrapePhotoPost(url);
        if (photoResult) {
          return photoResult;
        }
      }

      // If both video extraction and photo scraping could not extract anonymous media:
      // Provide an informative, accurate error message explaining Meta's authentication wall
      if (isExplicitPhotoUrl) {
        throw new PrivateContentError(
          'This Facebook photo post requires account login or is restricted by Meta privacy settings. DAWREM supports public Facebook videos and reels.'
        );
      }

      throw ytErr;
    }
  }

  /**
   * Attempts to extract a public photo post via HTML tags and open graph previews.
   */
  private async tryScrapePhotoPost(url: string): Promise<MediaAnalysisResult | null> {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 6000,
        maxRedirects: 5,
      });

      const html = typeof res.data === 'string' ? res.data : '';

      // Match Open Graph image or scontent image
      const ogImgMatch =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      const ogTitleMatch =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);

      let photoUrl = ogImgMatch ? ogImgMatch[1].replace(/&amp;/g, '&') : null;

      // If not in meta, check scontent fbcdn pattern
      if (!photoUrl) {
        const scontentMatches = html.match(/https:[\\\/]+scontent[^"'\s<>]+\.fbcdn\.net[\\\/][^"'\s<>]+/gi);
        if (scontentMatches && scontentMatches.length > 0) {
          photoUrl = scontentMatches[0].replace(/\\\//g, '/').replace(/&amp;/g, '&');
        }
      }

      if (photoUrl && !photoUrl.includes('security/hsts-pixel') && !photoUrl.includes('rsrc.php')) {
        const title = ogTitleMatch ? ogTitleMatch[1] : 'Facebook Photo';

        const formats: MediaFormat[] = [
          {
            formatId: 'fb-image-original',
            label: 'Original High-Res Photo (JPG)',
            type: 'image',
            extension: 'jpg',
            quality: 'High Resolution',
            directDownloadUrl: photoUrl,
            supportsWatermarkRemoval: false,
          },
        ];

        return {
          id: `fb-${Date.now()}`,
          url,
          platform: this.platformId,
          platformName: this.platformName,
          title,
          thumbnail: photoUrl,
          author: 'Facebook User',
          duration: 0,
          formattedDuration: '00:00',
          supportsWatermarkRemoval: false,
          availableFormats: formats,
        };
      }
    } catch {
      // Photo scrape failed
    }

    return null;
  }
}

export const facebookHandler = new FacebookHandler();
