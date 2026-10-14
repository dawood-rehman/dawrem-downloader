import path from 'path';
import os from 'os';

// Resolve FFmpeg & FFprobe paths safely
let ffmpegBinaryPath = 'ffmpeg';
let ffprobeBinaryPath = 'ffprobe';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  if (ffmpegInstaller?.path) {
    ffmpegBinaryPath = ffmpegInstaller.path;
  }
} catch {
  // fallback to system PATH
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
  if (ffprobeInstaller?.path) {
    ffprobeBinaryPath = ffprobeInstaller.path;
  }
} catch {
  // fallback to system PATH
}

// Resolve yt-dlp binary path safely
let ytDlpBinaryPath = 'yt-dlp';
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  const localYtDlp = path.join(
    process.cwd(),
    'node_modules',
    'yt-dlp-exec',
    'bin',
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  );
  if (fs.existsSync(localYtDlp)) {
    ytDlpBinaryPath = localYtDlp;
  }
} catch {
  // fallback to PATH
}

export const APP_CONFIG = {
  name: 'DAWREM Downloader',
  version: '1.0.0',
  description: 'Clean, multi-platform media downloader with watermark removal and format conversion',
  
  // Storage
  tempDir:
    process.env.TEMP_DIR ||
    (process.env.VERCEL
      ? path.join(os.tmpdir(), 'dawrem-downloader')
      : path.join(process.cwd(), 'tmp_downloads')),
  tempFileTtlMs: 15 * 60 * 1000, // 15 minutes TTL for temporary files
  
  // Binaries
  ffmpegPath: ffmpegBinaryPath,
  ffprobePath: ffprobeBinaryPath,
  ytDlpPath: ytDlpBinaryPath,
  
  // Limits
  maxFileSizeBytes: 500 * 1024 * 1024, // 500MB
  analysisTimeoutMs: 30000, // 30 seconds
  downloadTimeoutMs: 180000, // 3 minutes
  rateLimitPerMinute: 60, // 60 requests per minute per IP
  
  // Supported Platforms
  supportedPlatforms: ['youtube', 'instagram', 'facebook', 'tiktok', 'pinterest'] as const,
};

export type SupportedPlatform = (typeof APP_CONFIG.supportedPlatforms)[number];
