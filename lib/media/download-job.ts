import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { APP_CONFIG } from '../config';
import { ensureTempDir, removeTempFile } from './cleanup';
import { formatBytes, sanitizeFilename } from './formatter';
import { processMediaWithFFmpeg, muxVideoAndAudio } from './processor';
import { analyzeMedia } from '../platforms';
import { FileSizeLimitError } from '../errors/downloader-errors';

export type JobStatus = 'Preparing' | 'Downloading' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';

export interface DownloadJob {
  id: string;
  url: string;
  platform: string;
  formatId: string;
  removeWatermark: boolean;
  status: JobStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  downloadedFormatted: string;
  totalFormatted: string;
  speedFormatted: string;
  error?: string;
  finalFilePath?: string;
  fileName?: string;
  mimeType?: string;
  createdAt: number;
  updatedAt: number;
}

// Global in-memory active download jobs registry shared across all Next.js worker threads and routes
declare global {
  var __dawrem_jobs_registry__: Map<string, DownloadJob> | undefined;
  var __dawrem_job_controllers__: Map<string, AbortController> | undefined;
  var __dawrem_job_children__: Map<string, import('child_process').ChildProcess> | undefined;
}

const jobsRegistry: Map<string, DownloadJob> =
  globalThis.__dawrem_jobs_registry__ ||
  (globalThis.__dawrem_jobs_registry__ = new Map<string, DownloadJob>());
const jobControllers =
  globalThis.__dawrem_job_controllers__ ||
  (globalThis.__dawrem_job_controllers__ = new Map<string, AbortController>());
const jobChildren =
  globalThis.__dawrem_job_children__ ||
  (globalThis.__dawrem_job_children__ = new Map<string, import('child_process').ChildProcess>());

function getJobsStateDir(): string {
  const dir = path.join(APP_CONFIG.tempDir, 'job_states');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return dir;
}

export function saveJobState(job: DownloadJob): void {
  jobsRegistry.set(job.id, job);
  try {
    const dir = getJobsStateDir();
    fs.writeFileSync(path.join(dir, `${job.id}.json`), JSON.stringify(job));
  } catch {}
}

/**
 * Retrieves an existing job by ID with memory + disk backup.
 */
export function getDownloadJob(jobId: string): DownloadJob | undefined {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
    return undefined;
  }
  const memJob = jobsRegistry.get(jobId);
  if (memJob) return memJob;

  try {
    const filePath = path.join(getJobsStateDir(), `${jobId}.json`);
    if (fs.existsSync(filePath)) {
      const diskJob = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DownloadJob;
      jobsRegistry.set(jobId, diskJob);
      return diskJob;
    }
  } catch {}

  return undefined;
}

/**
 * Creates and initiates a background download job.
 */
export async function createAndStartDownloadJob(params: {
  url: string;
  formatId: string;
  platform: string;
  removeWatermark?: boolean;
}): Promise<DownloadJob> {
  const jobId = uuidv4();
  const job: DownloadJob = {
    id: jobId,
    url: params.url,
    platform: params.platform,
    formatId: params.formatId,
    removeWatermark: !!params.removeWatermark,
    status: 'Preparing',
    progress: 5,
    downloadedBytes: 0,
    totalBytes: 0,
    speedBytesPerSec: 0,
    downloadedFormatted: '0 MB',
    totalFormatted: 'Unknown',
    speedFormatted: '0 KB/s',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  jobsRegistry.set(jobId, job);
  saveJobState(job);
  const controller = new AbortController();
  jobControllers.set(jobId, controller);

  // Execute processing asynchronously
  runJobPipeline(job, controller.signal).catch((err) => {
    console.error(`[JOB_FAILED] Job ${jobId} failed:`, err);
    job.status = controller.signal.aborted ? 'Cancelled' : 'Failed';
    job.error = controller.signal.aborted ? 'Download cancelled.' : err.message || 'Media download failed.';
    job.updatedAt = Date.now();
    saveJobState(job);
  }).finally(() => {
    jobControllers.delete(jobId);
    jobChildren.delete(jobId);
  });

  return job;
}

export function cancelDownloadJob(jobId: string): 'not_found' | 'not_running' | DownloadJob {
  const job = getDownloadJob(jobId);
  if (!job) return 'not_found';
  if (job.status === 'Completed' || job.status === 'Failed' || job.status === 'Cancelled') return 'not_running';

  const controller = jobControllers.get(jobId);
  if (!controller) return 'not_running';

  controller.abort();
  jobChildren.get(jobId)?.kill('SIGTERM');
  job.status = 'Cancelled';
  job.error = 'Download cancelled.';
  job.updatedAt = Date.now();
  saveJobState(job);
  return job;
}

function throwIfCancelled(signal: AbortSignal): void {
  if (signal.aborted) throw new Error('Download cancelled.');
}

/**
 * Executes the full download and conversion pipeline with high-speed multithreading and no redundant re-encoding.
 */
async function runJobPipeline(job: DownloadJob, signal: AbortSignal): Promise<void> {
  const tempDir = ensureTempDir();
  const rawId = uuidv4().slice(0, 8);
  let tempRawPath = '';
  let tempVideoPath: string | null = null;
  let tempAudioPath: string | null = null;
  let finalPath = '';

  try {
    job.status = 'Preparing';
    job.progress = 10;
    job.updatedAt = Date.now();
    saveJobState(job);

    // 1. Analyze media to retrieve title, format specs, and direct streams (retrieved in 0ms from cache)
    const meta = await analyzeMedia(job.url);
    throwIfCancelled(signal);
    const selectedFormat = meta.availableFormats.find((f) => f.formatId === job.formatId);
    if (!selectedFormat) {
      throw new Error('The selected format is no longer available. Please analyze the link again.');
    }

    const safeBaseName = sanitizeFilename(meta.title, 'dawrem-media');
    const isAudioTarget = selectedFormat.type === 'audio' || job.formatId.includes('audio');
    const isImageTarget = selectedFormat.type === 'image' || ['jpg', 'png', 'webp'].includes(selectedFormat.extension);
    const targetExtension = isImageTarget
      ? (selectedFormat.extension || 'jpg')
      : isAudioTarget
      ? (selectedFormat.extension || 'mp3')
      : 'mp4';
    job.fileName = `${safeBaseName}.${targetExtension}`;
    job.mimeType = isImageTarget
      ? targetExtension === 'png'
        ? 'image/png'
        : 'image/jpeg'
      : isAudioTarget
      ? targetExtension === 'm4a'
        ? 'audio/mp4'
        : targetExtension === 'webm'
        ? 'audio/webm'
        : 'audio/mpeg'
      : 'video/mp4';

    job.status = 'Downloading';
    job.progress = 15;
    job.updatedAt = Date.now();

    // 2. Download media stream
    tempRawPath = path.join(tempDir, `raw_${rawId}.${selectedFormat.extension || targetExtension}`);

    let ytDlpHandledTarget = false;

    const isDirectAvailable =
      !!selectedFormat.directDownloadUrl &&
      !(isAudioTarget && targetExtension === 'mp3') &&
      !job.url.includes('youtube.com') &&
      !job.url.includes('youtu.be');

    if (isDirectAvailable) {
      try {
        if (selectedFormat.type === 'video' && selectedFormat.directAudioUrl) {
          // Both separate video and audio DASH streams are available (e.g. Instagram Reels, Facebook DASH)
          tempVideoPath = path.join(tempDir, `raw_v_${rawId}.${selectedFormat.extension || 'mp4'}`);
          tempAudioPath = path.join(tempDir, `raw_a_${rawId}.m4a`);

          // 2a. Download direct video stream (progress 15% -> 75%)
          await downloadDirectStream(selectedFormat.directDownloadUrl!, tempVideoPath, job, { start: 15, end: 75 }, signal);

          // 2b. Download direct audio stream (progress 75% -> 88%)
          job.speedFormatted = 'Fetching audio track...';
          await downloadDirectStream(selectedFormat.directAudioUrl, tempAudioPath, job, { start: 75, end: 88 }, signal);

          // 2c. Fast stream-level mux with FFmpeg (< 0.3s)
          job.status = 'Processing';
          job.progress = 90;
          job.speedFormatted = 'Merging video & audio...';
          job.updatedAt = Date.now();
          saveJobState(job);

          await muxVideoAndAudio({
            videoPath: tempVideoPath,
            audioPath: tempAudioPath,
            outputPath: tempRawPath,
            signal,
          });

          // Clean up individual raw streams
          await removeTempFile(tempVideoPath);
          await removeTempFile(tempAudioPath);
          tempVideoPath = null;
          tempAudioPath = null;
        } else if (selectedFormat.type === 'video' && !selectedFormat.hasAudio) {
          // Video-only stream without direct audio URL -> fallback to yt-dlp to find and mux audio
          await downloadViaYtDlp(job.url, selectedFormat, tempRawPath, job, isAudioTarget, targetExtension, signal);
          ytDlpHandledTarget = true;
        } else {
          // Progressive video with integrated audio, single audio track, or image
          await downloadDirectStream(selectedFormat.directDownloadUrl!, tempRawPath, job, { start: 15, end: 90 }, signal);
        }
      } catch (streamErr) {
        throwIfCancelled(signal);
        console.warn('[DIRECT_DOWNLOAD_FALLBACK] Direct stream/mux failed, falling back to yt-dlp:', (streamErr as Error).message);
        if (tempVideoPath) await removeTempFile(tempVideoPath).catch(() => {});
        if (tempAudioPath) await removeTempFile(tempAudioPath).catch(() => {});
        if (tempRawPath && fs.existsSync(tempRawPath)) await removeTempFile(tempRawPath).catch(() => {});
        tempVideoPath = null;
        tempAudioPath = null;

        await downloadViaYtDlp(job.url, selectedFormat, tempRawPath, job, isAudioTarget, targetExtension, signal);
        ytDlpHandledTarget = true;
      }
    } else {
      // Use yt-dlp to stream download
      await downloadViaYtDlp(job.url, selectedFormat, tempRawPath, job, isAudioTarget, targetExtension, signal);
      ytDlpHandledTarget = true;
    }
    throwIfCancelled(signal);

    // 3. Post-processing determination
    // Watermark removal only if the format actually has a watermark AND user requested it
    const isDelogoRequired = !isImageTarget && !!selectedFormat.hasWatermark && !!job.removeWatermark;
    // Audio conversion only if audio requested AND yt-dlp hasn't already converted it directly
    const isAudioConversionRequired = isAudioTarget && !ytDlpHandledTarget && !tempRawPath.toLowerCase().endsWith('.mp3');

    const needsProcessing = isDelogoRequired || isAudioConversionRequired;

    if (needsProcessing) {
      job.status = 'Processing';
      job.progress = 90;
      job.speedFormatted = 'Processing...';
      job.updatedAt = Date.now();
      saveJobState(job);

      finalPath = path.join(tempDir, `dawrem_${rawId}.${targetExtension}`);

      await processMediaWithFFmpeg({
        inputPath: tempRawPath,
        outputPath: finalPath,
        targetFormat: isAudioTarget ? 'mp3' : 'mp4',
        removeWatermark: isDelogoRequired,
        onProgress: (p) => {
          job.progress = Math.min(98, 90 + Math.round((p / 100) * 8));
          job.updatedAt = Date.now();
          saveJobState(job);
        },
        signal,
      });

      // Remove raw file after successful processing
      await removeTempFile(tempRawPath);
    } else {
      finalPath = tempRawPath;
    }

    // Enforce the same size ceiling after any conversion or muxing step.
    const finalStats = await fs.promises.stat(finalPath);
    throwIfCancelled(signal);
    if (finalStats.size > APP_CONFIG.maxFileSizeBytes) {
      throw new FileSizeLimitError();
    }

    // 4. Mark job as completed immediately
    job.status = 'Completed';
    job.progress = 100;
    job.finalFilePath = finalPath;
    const finalFileSize = finalStats.size;
    job.downloadedBytes = finalFileSize || job.totalBytes;
    job.totalBytes = job.downloadedBytes;
    job.downloadedFormatted = formatBytes(job.downloadedBytes);
    job.totalFormatted = formatBytes(job.totalBytes);
    job.speedFormatted = 'Complete';
    job.updatedAt = Date.now();
    saveJobState(job);
  } catch (err: unknown) {
    job.status = signal.aborted ? 'Cancelled' : 'Failed';
    job.error = signal.aborted ? 'Download cancelled.' : (err as Error)?.message || 'Download pipeline failed.';
    job.updatedAt = Date.now();
    saveJobState(job);

    // Cleanup raw files on failure
    if (tempVideoPath) await removeTempFile(tempVideoPath).catch(() => {});
    if (tempAudioPath) await removeTempFile(tempAudioPath).catch(() => {});
    if (tempRawPath) await removeTempFile(tempRawPath).catch(() => {});
    if (finalPath) await removeTempFile(finalPath).catch(() => {});
    throw err;
  }
}

/**
 * Downloads direct HTTP media stream with real-time byte counters and speed calculation.
 */
async function downloadDirectStream(
  downloadUrl: string,
  outputPath: string,
  job: DownloadJob,
  progressRange: { start: number; end: number } = { start: 15, end: 95 },
  signal: AbortSignal
): Promise<void> {
  throwIfCancelled(signal);
  await assertSafeMediaUrl(downloadUrl);
  throwIfCancelled(signal);

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: '*/*',
  };

  if (job.url.includes('tiktok.com')) {
    headers['Referer'] = 'https://www.tiktok.com/';
  } else if (job.url.includes('instagram.com')) {
    headers['Referer'] = 'https://www.instagram.com/';
  } else if (job.url.includes('pinterest.com') || job.url.includes('pin.it')) {
    headers['Referer'] = 'https://www.pinterest.com/';
  } else if (job.url.includes('facebook.com') || job.url.includes('fb.watch')) {
    headers['Referer'] = 'https://www.facebook.com/';
  }

  const response = await axios({
    url: downloadUrl,
    method: 'GET',
    responseType: 'stream',
    timeout: APP_CONFIG.downloadTimeoutMs,
    headers,
    maxRedirects: 0,
    maxContentLength: APP_CONFIG.maxFileSizeBytes,
    signal,
  });

  const rawContentLength = response.headers['content-length'];
  const totalLength = typeof rawContentLength === 'number' ? rawContentLength : parseInt(String(rawContentLength || '0'), 10);
  if (totalLength > APP_CONFIG.maxFileSizeBytes) {
    response.data.destroy();
    throw new FileSizeLimitError();
  }
  const writer = fs.createWriteStream(outputPath);
  if (!job.totalBytes || job.totalBytes < totalLength) {
    job.totalBytes = isNaN(totalLength) ? 0 : totalLength;
    job.totalFormatted = formatBytes(job.totalBytes);
  }

  let downloaded = 0;
  let lastTime = Date.now();
  let lastDownloaded = 0;

  return new Promise((resolve, reject) => {
    const rejectOnAbort = () => {
      const error = new Error('Download cancelled.');
      response.data.destroy(error);
      writer.destroy(error);
      reject(error);
    };

    if (signal.aborted) {
      rejectOnAbort();
      return;
    }
    signal.addEventListener('abort', rejectOnAbort, { once: true });

    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (downloaded > APP_CONFIG.maxFileSizeBytes) {
        const limitError = new FileSizeLimitError();
        response.data.destroy(limitError);
        writer.destroy(limitError);
        return;
      }
      job.downloadedBytes = downloaded;
      job.downloadedFormatted = formatBytes(downloaded);

      const now = Date.now();
      const timeDelta = (now - lastTime) / 1000;
      if (timeDelta >= 0.3) {
        const speed = (downloaded - lastDownloaded) / timeDelta;
        job.speedBytesPerSec = speed;
        job.speedFormatted = `${formatBytes(speed)}/s`;

        if (totalLength > 0) {
          const rangeSpan = progressRange.end - progressRange.start;
          const pct = Math.round((downloaded / totalLength) * rangeSpan);
          job.progress = Math.min(progressRange.end, progressRange.start + pct);
        }
        job.updatedAt = now;
        lastTime = now;
        lastDownloaded = downloaded;
        saveJobState(job);
      }
    });

    response.data.pipe(writer);

    writer.on('finish', () => {
      signal.removeEventListener('abort', rejectOnAbort);
      job.progress = progressRange.end;
      job.downloadedBytes = downloaded;
      job.downloadedFormatted = formatBytes(downloaded);
      job.updatedAt = Date.now();
      saveJobState(job);
      resolve();
    });

    writer.on('error', (err) => {
      signal.removeEventListener('abort', rejectOnAbort);
      reject(err);
    });

    response.data.on('error', (err: unknown) => {
      signal.removeEventListener('abort', rejectOnAbort);
      reject(err);
    });
  });
}

/** Reject direct media URLs that target local or reserved network addresses. */
async function assertSafeMediaUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('The media provider returned an invalid download URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('The media provider returned an unsafe download URL.');
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isPrivateAddress = (address: string) => {
    const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
    if (isIP(normalized) === 4) {
      const [a, b] = normalized.split('.').map(Number);
      return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19));
    }
    if (isIP(normalized) === 6) {
      return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') ||
        normalized.startsWith('fd') || /^fe[89ab]/.test(normalized) || normalized.startsWith('::ffff:');
    }
    return false;
  };

  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') ||
      hostname.endsWith('.internal') || isPrivateAddress(hostname)) {
    throw new Error('The media provider returned a non-public download host.');
  }

  if (!isIP(hostname)) {
    try {
      const records = await lookup(hostname, { all: true, verbatim: true });
      if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
        throw new Error('The media provider returned a non-public download host.');
      }
    } catch (error) {
      if ((error as Error).message.includes('non-public')) throw error;
      throw new Error('The media provider download host could not be verified.');
    }
  }
}

/**
 * Fast multi-threaded download via yt-dlp CLI with live progress parsing and no freezing.
 */
async function downloadViaYtDlp(
  url: string,
  format: any,
  outputPath: string,
  job: DownloadJob,
  isAudioTarget: boolean,
  targetExtension: string,
  signal: AbortSignal
): Promise<void> {
  throwIfCancelled(signal);
  return new Promise((resolve, reject) => {
    const formatArg = format.rawFormatSelector || 'bestvideo+bestaudio/best';
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

    const args: string[] = [
      url,
      '--output', outputPath,
      '--newline',
      '--concurrent-fragments', '10', // 10 parallel connections for maximum bandwidth
      '--buffer-size', '1M',          // 1MB buffer size for fluid network throughput
      '--retries', '5',
      '--fragment-retries', '10',
      '--no-playlist',
      '--no-warnings',
      '--js-runtimes', 'node',
      '--ffmpeg-location', APP_CONFIG.ffmpegPath,
      '--max-filesize', `${APP_CONFIG.maxFileSizeBytes}`,
    ];

    if (isYouTube) {
      args.push('--extractor-args', 'youtube:player_client=android,web');
    }

    if (isAudioTarget) {
      if (targetExtension === 'm4a') {
        // Direct download native M4A/AAC stream
        args.push(
          '-f', format.rawFormatSelector || 'ba[ext=m4a]/140/ba',
          '-x',
          '--audio-format', 'm4a'
        );
      } else if (targetExtension === 'webm') {
        // Direct download native WEBM/Opus audio stream
        args.push(
          '-f', format.rawFormatSelector || 'ba[ext=webm]/251/ba'
        );
      } else {
        // MP3 conversion with specific bitrate if selected
        let qualityArg = '0';
        if (job.formatId.includes('320k')) qualityArg = '320K';
        else if (job.formatId.includes('256k')) qualityArg = '256K';
        else if (job.formatId.includes('192k')) qualityArg = '192K';
        else if (job.formatId.includes('128k')) qualityArg = '128K';

        args.push(
          '--extract-audio',
          '--audio-format', 'mp3',
          '--audio-quality', qualityArg,
          '-f', format.rawFormatSelector || 'bestaudio/best'
        );
      }
    } else {
      args.push(
        '-f', formatArg,
        '--merge-output-format', 'mp4',
        '--postprocessor-args', 'Merger:-c:v copy -c:a aac'
      );
    }

    const ytProcess = spawn(APP_CONFIG.ytDlpPath, args);
    jobChildren.set(job.id, ytProcess);
    const abortProcess = () => ytProcess.kill('SIGTERM');
    signal.addEventListener('abort', abortProcess, { once: true });

    let stderrData = '';

    ytProcess.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      const lines = text.split(/[\r\n]+/);

      for (const line of lines) {
        if (!line.trim()) continue;

        // Parse download progress:
        // e.g. [download]  45.2% of ~  24.50MiB at    8.23MiB/s ETA 00:03
        // or [download] 100.0% of   11.73MiB at  630.63KiB/s ETA 00:00
        const pctMatch = line.match(/\[download\]\s+([\d\.]+)%\s+of\s+~?\s*([\d\.]+[A-Za-z]+)/);
        if (pctMatch) {
          const rawPct = parseFloat(pctMatch[1]);
          // Map 0-100% to 15-95% for UI smoothness
          job.progress = Math.min(95, Math.max(15, Math.round(15 + rawPct * 0.8)));
          job.totalFormatted = pctMatch[2];
          job.status = 'Downloading';

          // Calculate downloaded bytes in real-time so UI counters increment live
          const sizeValMatch = pctMatch[2].match(/([\d\.]+)\s*([A-Za-z]+)/);
          if (sizeValMatch) {
            const num = parseFloat(sizeValMatch[1]);
            const unit = sizeValMatch[2].toUpperCase();
            const multiplier = unit.startsWith('G') ? 1024 * 1024 * 1024 : unit.startsWith('M') ? 1024 * 1024 : 1024;
            const totalBytesEst = num * multiplier;
            job.totalBytes = Math.round(totalBytesEst);
            job.downloadedBytes = Math.round((rawPct / 100) * totalBytesEst);
            job.downloadedFormatted = formatBytes(job.downloadedBytes);
          }
        }

        const speedMatch = line.match(/at\s+([\d\.]+[A-Za-z]+\/s)/);
        if (speedMatch) {
          job.speedFormatted = speedMatch[1];
        }

        if (line.includes('[download] 100%')) {
          job.progress = 95;
        }

        // Post-download muxing / audio extraction state
        if (line.includes('[Merger]') || line.includes('[ExtractAudio]')) {
          job.status = 'Processing';
          job.progress = 96;
          job.speedFormatted = 'Finalizing...';
        }

        job.updatedAt = Date.now();
        saveJobState(job);
      }
    });

    ytProcess.stderr.on('data', (chunk: Buffer) => {
      stderrData += chunk.toString();
    });

    ytProcess.on('close', (code) => {
      signal.removeEventListener('abort', abortProcess);
      jobChildren.delete(job.id);
      if (signal.aborted) {
        reject(new Error('Download cancelled.'));
        return;
      }
      if (code === 0) {
        // Confirm output file exists
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          if (stats.size > APP_CONFIG.maxFileSizeBytes) {
            removeTempFile(outputPath).catch(() => {});
            reject(new FileSizeLimitError());
            return;
          }
          job.totalBytes = stats.size;
          job.downloadedBytes = stats.size;
          job.totalFormatted = formatBytes(stats.size);
          job.downloadedFormatted = formatBytes(stats.size);
          job.progress = 98;
          job.updatedAt = Date.now();
          saveJobState(job);
          resolve();
        } else {
          // Dynamic file detection in temp directory in case yt-dlp adjusted extension
          const parentDir = path.dirname(outputPath);
          const baseNameWithoutExt = path.basename(outputPath, path.extname(outputPath));
          const dirFiles = fs.readdirSync(parentDir);
          const matched = dirFiles.find((f) => f.startsWith(baseNameWithoutExt));
          if (matched) {
            const actualPath = path.join(parentDir, matched);
            const matchedStats = fs.statSync(actualPath);
            if (matchedStats.size > APP_CONFIG.maxFileSizeBytes) {
              removeTempFile(actualPath).catch(() => {});
              reject(new FileSizeLimitError());
              return;
            }
            fs.renameSync(actualPath, outputPath);
            const stats = fs.statSync(outputPath);
            job.totalBytes = stats.size;
            job.downloadedBytes = stats.size;
            job.totalFormatted = formatBytes(stats.size);
            job.downloadedFormatted = formatBytes(stats.size);
            job.progress = 98;
            job.updatedAt = Date.now();
            saveJobState(job);
            resolve();
          } else {
            reject(new Error(`yt-dlp finished but output file was not found: ${outputPath}`));
          }
        }
      } else {
        console.error('[YTDLP_SPAWN_ERROR]', stderrData);
        reject(new Error(`yt-dlp download failed with code ${code}: ${stderrData.slice(-300)}`));
      }
    });

    ytProcess.on('error', (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
}

// Sweep completed jobs memory and disk cache periodically
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobsRegistry.entries()) {
    if (job.createdAt < cutoff) {
      if (job.finalFilePath) {
        removeTempFile(job.finalFilePath).catch(() => {});
      }
      jobsRegistry.delete(id);
      try {
        const filePath = path.join(getJobsStateDir(), `${id}.json`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
    }
  }
}, 5 * 60 * 1000);

