import { NextRequest, NextResponse } from 'next/server';
import { createPrivateDownloadUrl } from '@/lib/media/vercel-storage';
import { getDownloadJob } from '@/lib/media/download-job';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get('id');
    if (!jobId) return new NextResponse('Job ID is required.', { status: 400 });

    const job = await getDownloadJob(jobId);
    if (!job || job.status !== 'Completed' || !job.blobPath) {
      return new NextResponse('File is not ready or has expired.', { status: 404 });
    }

    // Large files go directly from private Blob to the browser. Vercel Functions
    // only mint a short-lived URL and never proxy the media bytes.
    const signedUrl = await createPrivateDownloadUrl(job.blobPath);
    return NextResponse.redirect(signedUrl, {
      status: 303,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[FILE_SIGNING_ERROR]', error);
    return new NextResponse('Could not prepare the file download.', { status: 500 });
  }
}
