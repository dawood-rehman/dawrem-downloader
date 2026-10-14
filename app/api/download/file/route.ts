import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { NextRequest, NextResponse } from 'next/server';
import { getDownloadJob } from '@/lib/media/download-job';
import { APP_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * Creates RFC 6266 and RFC 5987 compliant Content-Disposition header.
 * - `filename="..."`: Strictly sanitized ASCII fallback (char codes 32-126, no quotes or backslashes)
 *   to guarantee WHATWG ByteString compliance and prevent header injection.
 * - `filename*=UTF-8''...`: Percent-encoded UTF-8 filename so modern browsers (Chrome, Edge, Firefox, Safari)
 *   save the file with full Unicode characters, emojis, and special symbols intact.
 */
function createContentDisposition(fileName: string): string {
  // ASCII fallback for ByteString compliance: strip any character with code > 126 or < 32
  const asciiFallback = fileName
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/["\\;]/g, '_')
    .trim() || 'dawrem-media.mp4';

  const utf8Encoded = encodeURIComponent(fileName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('id');

    if (!jobId) {
      return new NextResponse('Job ID is required.', { status: 400 });
    }

    const job = getDownloadJob(jobId);
    if (!job || job.status !== 'Completed' || !job.finalFilePath) {
      return new NextResponse('File is not ready or has expired.', { status: 404 });
    }

    // Path safety verification (case-insensitive for Windows)
    const resolvedPath = path.resolve(job.finalFilePath);
    const resolvedTemp = path.resolve(APP_CONFIG.tempDir);
    const isInsideTemp = process.platform === 'win32'
      ? resolvedPath.toLowerCase() === resolvedTemp.toLowerCase() || resolvedPath.toLowerCase().startsWith(`${resolvedTemp.toLowerCase()}${path.sep.toLowerCase()}`)
      : resolvedPath === resolvedTemp || resolvedPath.startsWith(`${resolvedTemp}${path.sep}`);

    if (!isInsideTemp || !fs.existsSync(resolvedPath)) {
      return new NextResponse('File not found on server.', { status: 404 });
    }

    const fileStat = fs.statSync(resolvedPath);
    const totalSize = fileStat.size;
    const contentDisposition = createContentDisposition(job.fileName || 'dawrem-media.mp4');
    const mimeType = job.mimeType || 'application/octet-stream';

    // Support HTTP 206 Partial Content / Range requests (essential for Chrome "Resume" and parallel chunks)
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      const match = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = Math.min(match[2] ? parseInt(match[2], 10) : totalSize - 1, totalSize - 1);

        if (start < totalSize && end >= start) {
          const chunkSize = end - start + 1;
          const rangeStream = fs.createReadStream(resolvedPath, { start, end });
          const webStream = Readable.toWeb(rangeStream) as ReadableStream;

          return new NextResponse(webStream, {
            status: 206,
            headers: {
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunkSize.toString(),
              'Content-Type': mimeType,
              'Content-Disposition': contentDisposition,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
      }
      return new NextResponse('Requested byte range is not satisfiable.', {
        status: 416,
        headers: { 'Content-Range': `bytes */${totalSize}` },
      });
    }

    // Full file stream using Node native Readable.toWeb with automatic backpressure handling
    const fileStream = fs.createReadStream(resolvedPath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Type': mimeType,
        'Content-Length': totalSize.toString(),
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[FILE_SERVE_ERROR]', error);
    return new NextResponse('Internal server error streaming media file.', { status: 500 });
  }
}
