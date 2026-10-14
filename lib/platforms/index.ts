import { SupportedPlatform } from '../config';
import { UnsupportedPlatformError } from '../errors/downloader-errors';
import { detectPlatform } from './detector';
import { facebookHandler } from './facebook';
import { instagramHandler } from './instagram';
import { pinterestHandler } from './pinterest';
import { tikTokHandler } from './tiktok';
import { MediaAnalysisResult, PlatformHandler } from './types';
import { youtubeHandler } from './youtube';

const platformHandlers: Record<SupportedPlatform, PlatformHandler> = {
  youtube: youtubeHandler,
  tiktok: tikTokHandler,
  instagram: instagramHandler,
  facebook: facebookHandler,
  pinterest: pinterestHandler,
};

// Global in-memory cache shared across all Next.js route bundles
declare global {
  var __dawrem_analysis_cache__: Map<string, { data: MediaAnalysisResult; expiresAt: number }> | undefined;
}

const analysisCache =
  globalThis.__dawrem_analysis_cache__ ||
  (globalThis.__dawrem_analysis_cache__ = new Map<string, { data: MediaAnalysisResult; expiresAt: number }>());

/**
 * Resolves the platform handler for the given platform or URL.
 */
export function getPlatformHandler(platformOrUrl: string): PlatformHandler {
  let platformId: SupportedPlatform | null = null;

  if (['youtube', 'tiktok', 'instagram', 'facebook', 'pinterest'].includes(platformOrUrl)) {
    platformId = platformOrUrl as SupportedPlatform;
  } else {
    platformId = detectPlatform(platformOrUrl);
  }

  if (!platformId || !platformHandlers[platformId]) {
    throw new UnsupportedPlatformError();
  }

  return platformHandlers[platformId];
}

/**
 * Automatically detects platform and runs media analysis with high-speed memory caching
 * to avoid duplicate heavy yt-dlp metadata extraction when the download job starts.
 */
export async function analyzeMedia(url: string, bypassCache = false): Promise<MediaAnalysisResult> {
  const normalizedUrl = url.trim();
  const now = Date.now();

  // Keep this process-local cache bounded on long-lived Node deployments.
  if (analysisCache.size > 500) {
    for (const [key, entry] of analysisCache) {
      if (entry.expiresAt <= now) analysisCache.delete(key);
    }
    while (analysisCache.size >= 500) {
      const oldestKey = analysisCache.keys().next().value;
      if (oldestKey === undefined) break;
      analysisCache.delete(oldestKey);
    }
  }

  if (!bypassCache) {
    const cached = analysisCache.get(normalizedUrl);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  const handler = getPlatformHandler(normalizedUrl);
  const result = await handler.analyze(normalizedUrl);

  // Cache analysis for 10 minutes (TTL) under both input URL and canonical result URL
  analysisCache.set(normalizedUrl, {
    data: result,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  if (result.url && result.url.trim() !== normalizedUrl) {
    analysisCache.set(result.url.trim(), {
      data: result,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
  }

  return result;
}

export * from './types';
export * from './detector';
