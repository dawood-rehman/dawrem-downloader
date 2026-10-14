import youtubedl from 'yt-dlp-exec';
import {
  MediaUnavailableError,
  PrivateContentError,
  NetworkTimeoutError,
  DownloaderError,
} from '../errors/downloader-errors';
import { formatBytes } from '../media/formatter';
import { MediaFormat } from './types';
import { APP_CONFIG } from '../config';

export interface YtDlpDumpResult {
  id?: string;
  title?: string;
  thumbnail?: string;
  uploader?: string;
  channel?: string;
  creator?: string;
  duration?: number;
  description?: string;
  webpage_url?: string;
  formats?: Array<{
    format_id?: string;
    format_note?: string;
    ext?: string;
    resolution?: string;
    height?: number;
    width?: number;
    filesize?: number;
    filesize_approx?: number;
    vcodec?: string;
    acodec?: string;
    url?: string;
    tbr?: number;
    abr?: number;
  }>;
}

/**
 * Executes yt-dlp to inspect media with adaptive player client strategies
 * to bypass bot detection challenges on YouTube and other platforms.
 */
export async function getMediaMetadataWithYtDlp(url: string): Promise<YtDlpDumpResult> {
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

  // Multi-tier client strategy: start with default (web/native with Node JS runtime) to retrieve all formats without throttling
  const clientTiers = isYouTube
    ? [undefined, 'youtube:player_client=android,web', 'youtube:player_client=ios,web', 'youtube:player_client=web']
    : [undefined];

  let lastError: any = null;

  for (const clientArg of clientTiers) {
    try {
      const options: Record<string, any> = {
        dumpSingleJson: true,
        noPlaylist: true,
        skipDownload: true,
        jsRuntimes: 'node',
      };

      if (clientArg) {
        options.extractorArgs = clientArg;
      }

      const result = await youtubedl(url, options, {
        timeout: APP_CONFIG.analysisTimeoutMs,
      });
      return result as YtDlpDumpResult;
    } catch (err: unknown) {
      lastError = err;
      const errMessage = (err as Error)?.message || String(err);

      // If permanently private or deleted, don't retry other clients
      if (
        errMessage.includes('Private video') ||
        errMessage.includes('This video is private') ||
        errMessage.includes('Video unavailable') ||
        errMessage.includes('does not exist') ||
        errMessage.includes('404')
      ) {
        break;
      }
    }
  }

  // Handle mapped errors
  const errMessage = lastError?.stderr || lastError?.message || String(lastError);
  const diagnosticText = String(errMessage)
    .replace(/https?:\/\/[^\s"']+/gi, '[source-url]')
    .slice(-2_000);
  console.error('[YTDLP_METADATA_EXTRACTION_FAILED]', {
    code: lastError?.code,
    exitCode: lastError?.exitCode,
    details: diagnosticText,
  });

  if (/sign in to confirm|not a bot|confirm you.?re not a bot|bot check/i.test(errMessage)) {
    throw new DownloaderError(
      'The source platform rejected this server request.',
      'SOURCE_BLOCKED',
      503,
      'This platform is temporarily rejecting requests from our hosting network. Please try again later or use another public link.'
    );
  }

  if (/spawn .*ENOENT|ENOENT.*spawn|not found.*yt-dlp/i.test(errMessage)) {
    throw new DownloaderError(
      'The yt-dlp executable is unavailable in this deployment.',
      'EXTRACTOR_UNAVAILABLE',
      503,
      'The media extractor is not available right now. Please try again later.'
    );
  }

  if (
    errMessage.includes('Private video') ||
    errMessage.includes('login') ||
    errMessage.includes('account required') ||
    errMessage.includes('This video is private')
  ) {
    throw new PrivateContentError();
  }

  if (
    errMessage.includes('Video unavailable') ||
    errMessage.includes('not found') ||
    errMessage.includes('404') ||
    errMessage.includes('does not exist')
  ) {
    throw new MediaUnavailableError();
  }

  if (errMessage.includes('timed out') || errMessage.includes('Timeout')) {
    throw new NetworkTimeoutError();
  }

  throw new DownloaderError(
    'Unable to inspect media stream for this link.',
    'EXTRACTION_FAILED',
    400,
    'Could not extract media details. Please verify the URL or try again.'
  );
}

/**
 * Extracts comprehensive video (144p to 4K) and audio (MP3 multi-bitrate, M4A, WEBM) formats from yt-dlp metadata.
 */
export function extractAvailableFormats(data: YtDlpDumpResult): MediaFormat[] {
  const formats: MediaFormat[] = [];
  const rawFormats = data.formats || [];
  const duration = data.duration || 0;

  // 1. Video Resolutions Mapping (from 4K Ultra HD down to 144p Data Saver)
  const VIDEO_TIERS = [
    { tier: 2160, label: '2160p (4K Ultra HD)', quality: '4K' },
    { tier: 1440, label: '1440p (2K Quad HD)', quality: '2K' },
    { tier: 1080, label: '1080p (Full HD)', quality: '1080p' },
    { tier: 720, label: '720p (HD)', quality: '720p' },
    { tier: 480, label: '480p (Standard Definition)', quality: '480p' },
    { tier: 360, label: '360p (Medium Quality)', quality: '360p' },
    { tier: 240, label: '240p (Low Quality)', quality: '240p' },
    { tier: 144, label: '144p (Data Saver)', quality: '144p' },
  ];

  function getMatchingTier(h: number): number {
    if (h >= 1800) return 2160;
    if (h >= 1200) return 1440;
    if (h >= 900) return 1080;
    if (h >= 600) return 720;
    if (h >= 430) return 480;
    if (h >= 300) return 360;
    if (h >= 200) return 240;
    return 144;
  }

  // 1. Audio Formats Extraction & Preparation (needed for both video container muxing and audio options)
  const aFormats = rawFormats.filter(
    (f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none')
  );

  const m4aList = aFormats
    .filter((f) => f.ext === 'm4a' || f.ext === 'aac' || (f.ext === 'mp4' && (!f.vcodec || f.vcodec === 'none')) || f.acodec?.includes('mp4a'))
    .sort((a, b) => (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0));
  const webmList = aFormats.filter((f) => f.ext === 'webm').sort((a, b) => (b.abr || 0) - (a.abr || 0));

  const bestM4a = m4aList[0];
  const bestWebm = webmList[0];
  const bestAudioStream =
    m4aList.find((f) => !!f.url) ||
    aFormats.find((f) => !!f.url && f.acodec?.includes('mp4a')) ||
    aFormats.find((f) => !!f.url) ||
    bestM4a ||
    bestWebm ||
    aFormats[0];

  // Find best audio stream size to include in video container estimates
  let bestAudioBytes = 0;
  for (const f of aFormats) {
    const s = f.filesize || f.filesize_approx || 0;
    if (s > bestAudioBytes) bestAudioBytes = s;
  }
  if (!bestAudioBytes && duration > 0) {
    bestAudioBytes = Math.round((128 * 1000 / 8) * duration);
  }

  const videoTiersMap = new Map<number, { format: any; size: number }>();

  for (const fmt of rawFormats) {
    const isVideo = fmt.vcodec && fmt.vcodec !== 'none';
    if (!isVideo) continue;

    let h = fmt.height || 0;
    if (!h && fmt.resolution) {
      const m = fmt.resolution.match(/x(\d+)/);
      if (m) h = parseInt(m[1], 10);
    }
    if (!h) continue;

    const tier = getMatchingTier(h);
    const rawSize = fmt.filesize || fmt.filesize_approx || 0;
    const isProgressive = !!(fmt.acodec && fmt.acodec !== 'none');
    const totalEstSize = rawSize ? (isProgressive ? rawSize : rawSize + bestAudioBytes) : 0;

    const existing = videoTiersMap.get(tier);
    if (
      !existing ||
      totalEstSize > existing.size ||
      (fmt.vcodec?.includes('avc1') && !existing.format.vcodec?.includes('avc1'))
    ) {
      videoTiersMap.set(tier, { format: fmt, size: totalEstSize });
    }
  }

  // Add matched video tiers in descending order (2160p down to 144p)
  for (const tierObj of VIDEO_TIERS) {
    if (videoTiersMap.has(tierObj.tier)) {
      const item = videoTiersMap.get(tierObj.tier)!;
      const isProgressive = !!(item.format.acodec && item.format.acodec !== 'none');
      const directAudioUrl = !isProgressive && bestAudioStream?.url ? bestAudioStream.url : undefined;
      const hasAudio = isProgressive;

      formats.push({
        formatId: `video-${tierObj.tier}p`,
        rawFormatSelector: `bestvideo[height<=${tierObj.tier}]+bestaudio[ext=m4a]/bestvideo[height<=${tierObj.tier}]+bestaudio/best[height<=${tierObj.tier}]/best`,
        label: tierObj.label,
        type: 'video',
        extension: 'mp4',
        quality: tierObj.quality,
        fileSizeEstimate: item.size > 0 ? formatBytes(item.size) : undefined,
        hasWatermark: false,
        supportsWatermarkRemoval: true,
        directDownloadUrl: isProgressive || directAudioUrl ? item.format.url : undefined,
        directAudioUrl,
        hasAudio,
      });
    }
  }

  // Fallback if no specific video tiers matched but a video stream exists
  if (formats.length === 0) {
    const firstVideo = rawFormats.find((f) => f.vcodec && f.vcodec !== 'none');
    const isProgressive = !!(firstVideo?.acodec && firstVideo?.acodec !== 'none');
    const directAudioUrl = !isProgressive && bestAudioStream?.url ? bestAudioStream.url : undefined;
    const hasAudio = isProgressive;

    formats.push({
      formatId: 'video-best',
      rawFormatSelector: 'bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
      label: 'HD Video (MP4)',
      type: 'video',
      extension: 'mp4',
      quality: 'HD',
      hasWatermark: false,
      supportsWatermarkRemoval: true,
      directDownloadUrl: isProgressive || directAudioUrl ? firstVideo?.url : undefined,
      directAudioUrl,
      hasAudio,
    });
  }

  const estMp3Size = (kbps: number) => {
    if (duration > 0) {
      return formatBytes(Math.round((kbps * 1000 / 8) * duration));
    }
    if (bestAudioBytes > 0) {
      return formatBytes(Math.round(bestAudioBytes * (kbps / 128)));
    }
    return undefined;
  };

  // MP3 Quality Tiers (converted with high-fidelity LAME encoder)
  const mp3Options = [
    { id: 'audio-mp3-320k', label: 'Audio (MP3 - 320 kbps Ultra Quality)', quality: '320 kbps', size: estMp3Size(320) },
    { id: 'audio-mp3-256k', label: 'Audio (MP3 - 256 kbps High Quality)', quality: '256 kbps', size: estMp3Size(256) },
    { id: 'audio-mp3-192k', label: 'Audio (MP3 - 192 kbps Standard Quality)', quality: '192 kbps', size: estMp3Size(192) },
    { id: 'audio-mp3-128k', label: 'Audio (MP3 - 128 kbps Economy Quality)', quality: '128 kbps', size: estMp3Size(128) },
  ];

  for (const opt of mp3Options) {
    formats.push({
      formatId: opt.id,
      rawFormatSelector: 'bestaudio/best',
      label: opt.label,
      type: 'audio',
      extension: 'mp3',
      quality: opt.quality,
      fileSizeEstimate: opt.size,
      hasWatermark: false,
      supportsWatermarkRemoval: false,
    });
  }

  // Original M4A / AAC Stream (native YouTube stream, fast direct download)
  if (bestM4a) {
    const abr = Math.round(bestM4a.abr || 128);
    const size = bestM4a.filesize || bestM4a.filesize_approx;
    formats.push({
      formatId: 'audio-m4a',
      rawFormatSelector: bestM4a.format_id ? `${bestM4a.format_id}/ba[ext=m4a]/ba` : 'ba[ext=m4a]/ba',
      label: `Original Audio (M4A / AAC - ${abr} kbps)`,
      type: 'audio',
      extension: 'm4a',
      quality: `${abr} kbps AAC`,
      fileSizeEstimate: size ? formatBytes(size) : undefined,
      hasWatermark: false,
      supportsWatermarkRemoval: false,
      directDownloadUrl: bestM4a.url,
    });
  }

  // Original WEBM / Opus Stream
  if (bestWebm) {
    const abr = Math.round(bestWebm.abr || 130);
    const size = bestWebm.filesize || bestWebm.filesize_approx;
    formats.push({
      formatId: 'audio-webm',
      rawFormatSelector: bestWebm.format_id ? `${bestWebm.format_id}/ba[ext=webm]/ba` : 'ba[ext=webm]/ba',
      label: `Original Audio (WEBM / Opus - ${abr} kbps)`,
      type: 'audio',
      extension: 'webm',
      quality: `${abr} kbps Opus`,
      fileSizeEstimate: size ? formatBytes(size) : undefined,
      hasWatermark: false,
      supportsWatermarkRemoval: false,
      directDownloadUrl: bestWebm.url,
    });
  }

  // Data Saver Audio (if available)
  if (m4aList.length > 1) {
    const lowM4a = m4aList[m4aList.length - 1];
    const abr = Math.round(lowM4a.abr || 48);
    const size = lowM4a.filesize || lowM4a.filesize_approx;
    formats.push({
      formatId: 'audio-m4a-low',
      rawFormatSelector: lowM4a.format_id ? `${lowM4a.format_id}/ba[abr<=64]` : 'ba[abr<=64]',
      label: `Original Audio (M4A - ${abr} kbps Data Saver)`,
      type: 'audio',
      extension: 'm4a',
      quality: `${abr} kbps AAC`,
      fileSizeEstimate: size ? formatBytes(size) : undefined,
      hasWatermark: false,
      supportsWatermarkRemoval: false,
      directDownloadUrl: lowM4a.url,
    });
  }

  // Default alias for backwards compatibility
  formats.push({
    formatId: 'audio-mp3',
    rawFormatSelector: 'bestaudio/best',
    label: 'Audio (MP3 Standard)',
    type: 'audio',
    extension: 'mp3',
    quality: '320 kbps',
    fileSizeEstimate: estMp3Size(320),
    hasWatermark: false,
    supportsWatermarkRemoval: false,
  });

  return formats;
}
