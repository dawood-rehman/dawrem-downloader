import { NextRequest, NextResponse } from 'next/server';
import { fetchProfileContent } from '@/lib/profiles/service';
import { z } from 'zod';
import { readJsonBody, requestBodyErrorResponse } from '@/lib/http-json';

const ProfileFetchRequestSchema = z.object({
  query: z.string().trim().min(1).max(2048),
  platform: z.enum(['youtube', 'instagram', 'facebook', 'tiktok', 'pinterest']).optional(),
  cursor: z.union([z.number().int().positive(), z.string().max(32)]).optional(),
  limit: z.number().int().min(1).max(48).optional().default(24),
  contentType: z.enum(['all', 'video', 'reel', 'image', 'pin', 'post', 'story', 'highlight']).optional(),
  sessionCookie: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = ProfileFetchRequestSchema.safeParse(await readJsonBody(req, 12_000));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0]?.message || 'Invalid profile request.', code: 'VALIDATION_FAILED' } },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const result = await fetchProfileContent({
      query: body.query,
      platform: body.platform,
      cursor: body.cursor,
      limit: body.limit,
      contentType: body.contentType,
      sessionCookie: body.sessionCookie,
    });

    return NextResponse.json({
      success: true,
      data: result,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err: unknown) {
    const bodyError = requestBodyErrorResponse(err);
    if (bodyError) return bodyError;
    const message = err instanceof Error ? err.message : 'Failed to fetch profile content.';
    const status = message.includes('not found') ? 404 : 400;

    return NextResponse.json(
      {
        success: false,
        error: {
          message,
          code: 'PROFILE_FETCH_FAILED',
        },
      },
      { status, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}
