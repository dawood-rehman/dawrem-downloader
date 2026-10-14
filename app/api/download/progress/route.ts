import { NextRequest, NextResponse } from 'next/server';
import { getDownloadJob } from '@/lib/media/download-job';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('id');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ID', message: 'Job ID is required.' } },
      { status: 400 }
    );
  }

  const job = getDownloadJob(jobId);
  if (!job) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Download job not found or expired.' } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: job.id,
      formatId: job.formatId,
      status: job.status,
      progress: job.progress,
      downloadedFormatted: job.downloadedFormatted,
      totalFormatted: job.totalFormatted,
      speedFormatted: job.speedFormatted,
      error: job.error,
      fileName: job.fileName,
      downloadUrl: job.status === 'Completed' ? `/api/download/file?id=${job.id}` : null,
    },
  });
}
