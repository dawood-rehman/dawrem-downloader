import fs from 'fs';
import { ChildProcess, spawn } from 'child_process';
import { APP_CONFIG } from '../config';
import { ProcessingFailedError } from '../errors/downloader-errors';
import { probeVideoDimensions, buildWatermarkRemovalFilterChain } from './watermark';

export interface ProcessMediaOptions {
  inputPath: string;
  outputPath: string;
  targetFormat: 'mp4' | 'mp3';
  removeWatermark?: boolean;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

function attachAbort(child: ChildProcess, signal?: AbortSignal): () => void {
  if (!signal) return () => {};
  const terminate = () => child.kill('SIGTERM');
  if (signal.aborted) terminate();
  else signal.addEventListener('abort', terminate, { once: true });
  return () => signal.removeEventListener('abort', terminate);
}

/**
 * Processes media with FFmpeg:
 * - Converts to MP3 (audio extraction)
 * - Remuxes/encodes to clean MP4
 * - Removes watermarks using FFmpeg delogo filter when requested
 */
export async function processMediaWithFFmpeg(options: ProcessMediaOptions): Promise<string> {
  const { inputPath, outputPath, targetFormat, removeWatermark, onProgress, signal } = options;

  if (!fs.existsSync(inputPath)) {
    throw new ProcessingFailedError('Source media file was not found.');
  }

  return new Promise(async (resolve, reject) => {
    try {
      const args: string[] = ['-y', '-i', inputPath];

      if (targetFormat === 'mp3') {
        // Audio extraction to high-quality MP3
        args.push(
          '-vn', // No video
          '-c:a',
          'libmp3lame',
          '-q:a',
          '2', // Variable bitrate ~190-250 kbps (high quality)
          '-id3v2_version',
          '3'
        );
      } else {
        // Video processing
        if (removeWatermark) {
          // Probe dimensions to calculate delogo filter
          const { width, height } = await probeVideoDimensions(inputPath, signal);
          if (signal?.aborted) throw new Error('Download cancelled.');
          const filter = buildWatermarkRemovalFilterChain(width, height);
          args.push('-vf', filter);
          args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac');
        } else {
          // Fast remux or standard stream copy if compatible, else h264/aac
          args.push('-c:v', 'copy', '-c:a', 'copy');
        }
      }

      // Output path
      args.push(outputPath);

      const ffmpeg = spawn(APP_CONFIG.ffmpegPath, args);
      const detachAbort = attachAbort(ffmpeg, signal);

      let stderrOutput = '';

      ffmpeg.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrOutput += text;

        // Parse time/progress if available
        const timeMatch = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch && onProgress) {
          const hours = parseFloat(timeMatch[1]);
          const minutes = parseFloat(timeMatch[2]);
          const seconds = parseFloat(timeMatch[3]);
          const currentTimeSec = hours * 3600 + minutes * 60 + seconds;
          // Approximate percentage based on estimated time
          if (currentTimeSec > 0) {
            const estimatedProgress = Math.min(95, Math.round((currentTimeSec / 60) * 100));
            onProgress(estimatedProgress);
          }
        }
      });

      ffmpeg.on('close', (code) => {
        detachAbort();
        if (signal?.aborted) {
          reject(new Error('Download cancelled.'));
          return;
        }
        if (code === 0 && fs.existsSync(outputPath)) {
          if (onProgress) onProgress(100);
          resolve(outputPath);
        } else {
          console.error('[FFMPEG_ERROR]', stderrOutput);
          // If stream copy failed (sometimes due to mismatched container), retry with re-encoding
          if (!removeWatermark && targetFormat === 'mp4' && args.includes('copy')) {
            console.log('[FFMPEG_RETRY] Retrying with re-encode fallback...');
            reencodeFallback(inputPath, outputPath, onProgress, signal)
              .then(resolve)
              .catch(reject);
            return;
          }
          reject(new ProcessingFailedError('FFmpeg media conversion failed.'));
        }
      });

      ffmpeg.on('error', (err) => {
        detachAbort();
        console.error('[FFMPEG_SPAWN_ERROR]', err);
        reject(new ProcessingFailedError(`Failed to start FFmpeg processor: ${err.message}`));
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Fallback re-encode when stream copy fails
 */
function reencodeFallback(
  inputPath: string,
  outputPath: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      outputPath,
    ];

    const ffmpeg = spawn(APP_CONFIG.ffmpegPath, args);
    const detachAbort = attachAbort(ffmpeg, signal);

    ffmpeg.stderr.on('data', () => {
      if (onProgress) onProgress(80);
    });

    ffmpeg.on('close', (code) => {
      detachAbort();
      if (signal?.aborted) {
        reject(new Error('Download cancelled.'));
        return;
      }
      if (code === 0 && fs.existsSync(outputPath)) {
        if (onProgress) onProgress(100);
        resolve(outputPath);
      } else {
        reject(new ProcessingFailedError('FFmpeg re-encoding fallback failed.'));
      }
    });

    ffmpeg.on('error', (err) => {
      detachAbort();
      reject(err);
    });
  });
}

/**
 * Fast stream-level muxer for combining separate video and audio streams
 * into an MP4 container (-c:v copy -c:a aac -b:a 192k -shortest).
 * Completes in milliseconds with zero CPU video re-encoding overhead.
 */
export async function muxVideoAndAudio(options: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { videoPath, audioPath, outputPath, signal } = options;
  if (signal?.aborted) throw new Error('Download cancelled.');

  if (!fs.existsSync(videoPath)) {
    throw new ProcessingFailedError('Source video stream file was not found.');
  }
  if (!fs.existsSync(audioPath)) {
    throw new ProcessingFailedError('Source audio stream file was not found.');
  }

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      outputPath,
    ];

    const ffmpeg = spawn(APP_CONFIG.ffmpegPath, args);
    const detachAbort = attachAbort(ffmpeg, signal);
    let stderrOutput = '';

    ffmpeg.stderr.on('data', (chunk) => {
      stderrOutput += chunk.toString();
    });

    ffmpeg.on('close', (code) => {
      detachAbort();
      if (signal?.aborted) {
        reject(new Error('Download cancelled.'));
        return;
      }
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        console.error('[FFMPEG_MUX_ERROR]', stderrOutput);
        reject(new ProcessingFailedError('FFmpeg video and audio muxing failed.'));
      }
    });

    ffmpeg.on('error', (err) => {
      detachAbort();
      reject(new ProcessingFailedError(`Failed to spawn FFmpeg muxer: ${err.message}`));
    });
  });
}

