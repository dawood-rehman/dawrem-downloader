import { getDownloadUrl, issueSignedToken, presignUrl, put } from '@vercel/blob';
import { Redis } from '@upstash/redis';
import fs from 'node:fs';
import { DownloaderError } from '../errors/downloader-errors';

let redisClient: Redis | null = null;

export function getJobRedis(): Redis {
  if (redisClient) return redisClient;

  const url =
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_KV_REST_URL ??
    process.env.UPSTASH_REDIS_REST_KV_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new DownloaderError(
      'Upstash Redis is not configured for this deployment.',
      'STORAGE_NOT_CONFIGURED',
      503,
      'Connect Upstash Redis and a private Vercel Blob store to this Vercel project, then redeploy.'
    );
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function assertVercelStorageConfigured(): void {
  getJobRedis();

  const blobAuthAvailable =
    !!process.env.BLOB_READ_WRITE_TOKEN ||
    (!!process.env.VERCEL_OIDC_TOKEN && !!process.env.BLOB_STORE_ID);
  if (!blobAuthAvailable) {
    throw new DownloaderError(
      'Private Vercel Blob is not configured for this deployment.',
      'STORAGE_NOT_CONFIGURED',
      503,
      'Connect Upstash Redis and a private Vercel Blob store to this Vercel project, then redeploy.'
    );
  }
}

export async function uploadCompletedMedia(
  jobId: string,
  filePath: string,
  fileName: string,
  contentType: string
): Promise<string> {
  const pathname = `downloads/${jobId}/${fileName}`;
  const blob = await put(pathname, fs.createReadStream(filePath), {
    access: 'private',
    contentType,
    multipart: true,
  });
  return blob.pathname;
}

export async function createPrivateDownloadUrl(pathname: string): Promise<string> {
  const validUntil = Date.now() + 10 * 60 * 1000;
  const token = await issueSignedToken({
    pathname,
    operations: ['get'],
    validUntil,
  });
  const { presignedUrl } = await presignUrl(token, {
    pathname,
    operation: 'get',
    validUntil,
    access: 'private',
  });
  return getDownloadUrl(presignedUrl);
}
