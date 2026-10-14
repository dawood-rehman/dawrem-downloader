import { SupportedPlatform } from '../config';

export type PlatformId = SupportedPlatform;

export interface MediaFormat {
  formatId: string;
  label: string;
  type: 'video' | 'audio' | 'image';
  extension: 'mp4' | 'mp3' | 'webm' | 'm4a' | 'jpg' | 'png' | 'webp';
  quality: string;
  fileSizeEstimate?: string;
  hasWatermark?: boolean;
  supportsWatermarkRemoval?: boolean;
  rawFormatSelector?: string;
  directDownloadUrl?: string;
  directAudioUrl?: string;
  hasAudio?: boolean;
}

export interface MediaItemPreview {
  id: string;
  type: 'video' | 'image';
  url: string;
  thumbnail?: string;
  quality?: string;
}

export interface MediaAnalysisResult {
  id: string;
  url: string;
  platform: PlatformId;
  platformName: string;
  title: string;
  thumbnail: string;
  author: string;
  authorAvatar?: string;
  duration: number; // in seconds
  formattedDuration: string;
  supportsWatermarkRemoval: boolean;
  availableFormats: MediaFormat[];
  isCarousel?: boolean;
  carouselItems?: MediaItemPreview[];
}

export interface PlatformHandler {
  platformId: PlatformId;
  platformName: string;
  canHandle(url: string): boolean;
  analyze(url: string): Promise<MediaAnalysisResult>;
}
