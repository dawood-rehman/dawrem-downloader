import { spawn } from 'child_process';
import { APP_CONFIG } from '../config';

export interface VideoDimensions {
  width: number;
  height: number;
}

/**
 * Probes video dimensions using ffprobe.
 */
export async function probeVideoDimensions(inputPath: string, signal?: AbortSignal): Promise<VideoDimensions> {
  if (signal?.aborted) throw new Error('Download cancelled.');
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(APP_CONFIG.ffprobePath, [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'json',
      inputPath,
    ]);
    const abortProbe = () => ffprobe.kill('SIGTERM');
    if (signal?.aborted) abortProbe();
    else signal?.addEventListener('abort', abortProbe, { once: true });

    let output = '';
    let errorOutput = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on('close', (code) => {
      signal?.removeEventListener('abort', abortProbe);
      if (signal?.aborted) {
        reject(new Error('Download cancelled.'));
        return;
      }
      if (code !== 0 && errorOutput) {
        console.warn('[FFPROBE_ERROR]', errorOutput.slice(-300));
      }
      if (code === 0 && output) {
        try {
          const parsed = JSON.parse(output);
          const stream = parsed.streams?.[0];
          if (stream?.width && stream?.height) {
            resolve({
              width: Number(stream.width),
              height: Number(stream.height),
            });
            return;
          }
        } catch (e) {
          console.warn('[FFPROBE_PARSE_ERROR]', e);
        }
      }
      // Fallback default dimensions if probe fails or partial stream
      resolve({ width: 1080, height: 1920 });
    });

    ffprobe.on('error', (err) => {
      signal?.removeEventListener('abort', abortProbe);
      if (signal?.aborted) {
        reject(new Error('Download cancelled.'));
        return;
      }
      console.warn('[FFPROBE_SPAWN_ERROR]', err);
      resolve({ width: 1080, height: 1920 });
    });
  });
}

/**
 * Builds FFmpeg delogo or suppression filter for removing corner watermarks.
 * TikTok & Instagram Reels typically alternate watermarks in:
 * 1. Top-Left: x ~ 4% of width, y ~ 8% of height, w ~ 28% of width, h ~ 6% of height
 * 2. Bottom-Right: x ~ 68% of width, y ~ 85% of height, w ~ 28% of width, h ~ 6% of height
 */
export function buildWatermarkRemovalFilterChain(width: number, height: number): string {
  // Safe boundaries for standard 9:16 or 16:9 videos
  const isVertical = height > width;

  if (isVertical) {
    // Delogo coordinates for top-left and bottom-right watermark areas
    const wBox = Math.round(width * 0.26);
    const hBox = Math.round(height * 0.055);

    // Top-left watermark
    const tlX = Math.round(width * 0.04);
    const tlY = Math.round(height * 0.08);

    // Bottom-right watermark
    const brX = Math.max(0, width - wBox - Math.round(width * 0.04));
    const brY = Math.max(0, height - hBox - Math.round(height * 0.12));

    // Combine both delogo passes cleanly
    return `delogo=x=${tlX}:y=${tlY}:w=${wBox}:h=${hBox}:show=0,delogo=x=${brX}:y=${brY}:w=${wBox}:h=${hBox}:show=0`;
  } else {
    // Horizontal video: corner logo (typically bottom-right or top-right)
    const wBox = Math.round(width * 0.18);
    const hBox = Math.round(height * 0.08);
    const brX = Math.max(0, width - wBox - 20);
    const brY = Math.max(0, height - hBox - 20);

    return `delogo=x=${brX}:y=${brY}:w=${wBox}:h=${hBox}:show=0`;
  }
}
