import { NextRequest, NextResponse } from 'next/server';
import { cancelDownloadJob } from '@/lib/media/download-job';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('id');
  if (!jobId) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ID', message: 'Job ID is required.' } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const result = await cancelDownloadJob(jobId);
  if (result === 'not_found') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Download job not found or expired.' } },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (result === 'not_running') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_CANCELLABLE', message: 'This download is already finished.' } },
      { status: 409, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    { success: true, data: { id: result.id, status: result.status } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
