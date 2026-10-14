import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeRequestSchema, validateAndSanitizeUrl } from '@/lib/validation/url-validator';
import { analyzeMedia } from '@/lib/platforms';
import { formatErrorResponse, DownloaderError } from '@/lib/errors/downloader-errors';
import { readJsonBody, requestBodyErrorResponse } from '@/lib/http-json';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req, 8_192);

    // 1. Zod schema validation
    const parsed = AnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: parsed.error.issues[0]?.message || 'Invalid request parameters.',
          },
        },
        { status: 400 }
      );
    }

    // 2. Security sanitization and SSRF validation
    const { sanitizedUrl } = validateAndSanitizeUrl(parsed.data.url);

    // 3. Platform analysis
    const mediaResult = await analyzeMedia(sanitizedUrl);

    return NextResponse.json({
      success: true,
      data: mediaResult,
    });
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error);
    if (bodyError) return bodyError;
    const errorResponse = formatErrorResponse(error);
    const statusCode = error instanceof DownloaderError ? error.statusCode : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
