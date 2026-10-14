import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { DownloadRequestSchema, validateAndSanitizeUrl } from '@/lib/validation/url-validator';
import { createAndStartDownloadJob, runDownloadJob } from '@/lib/media/download-job';
import { formatErrorResponse, DownloaderError } from '@/lib/errors/downloader-errors';
import { readJsonBody, requestBodyErrorResponse } from '@/lib/http-json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req, 8_192);

    // 1. Zod validation
    const parsed = DownloadRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: parsed.error.issues[0]?.message || 'Invalid download parameters.',
          },
        },
        { status: 400 }
      );
    }

    // 2. Validate URL security
    const { sanitizedUrl, platform } = validateAndSanitizeUrl(parsed.data.url);
    if (platform !== parsed.data.platform) {
      return NextResponse.json(
        { success: false, error: { code: 'PLATFORM_MISMATCH', message: 'The selected platform does not match this link.' } },
        { status: 400 }
      );
    }

    // 3. Initiate job
    const job = await createAndStartDownloadJob({
      url: sanitizedUrl,
      formatId: parsed.data.formatId,
      platform: parsed.data.platform,
      removeWatermark: parsed.data.removeWatermark,
    });

    // Vercel may route every request to a different function instance. Keep the
    // worker alive for this invocation and persist all state outside its memory.
    after(async () => {
      await runDownloadJob(job.id);
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
      },
    });
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error);
    if (bodyError) return bodyError;
    const errorResponse = formatErrorResponse(error);
    const statusCode = error instanceof DownloaderError ? error.statusCode : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
