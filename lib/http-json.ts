import { NextResponse } from 'next/server';

export class RequestBodyError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413 | 415,
    public readonly code: 'INVALID_JSON' | 'REQUEST_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE'
  ) {
    super(message);
    this.name = 'RequestBodyError';
  }
}

/** Read small JSON API bodies with a hard byte ceiling, including chunked requests. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    throw new RequestBodyError('Content-Type must be application/json.', 415, 'UNSUPPORTED_MEDIA_TYPE');
  }

  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new RequestBodyError('Invalid Content-Length header.', 400, 'INVALID_JSON');
    }
    if (length > maxBytes) {
      throw new RequestBodyError('Request is too large.', 413, 'REQUEST_TOO_LARGE');
    }
  }

  if (!request.body) {
    throw new RequestBodyError('A JSON request body is required.', 400, 'INVALID_JSON');
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyError('Request is too large.', 413, 'REQUEST_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError('Request body must contain valid UTF-8 JSON.', 400, 'INVALID_JSON');
  }
}

export function requestBodyErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof RequestBodyError)) return null;
  return NextResponse.json(
    { success: false, error: { code: error.code, message: error.message } },
    { status: error.status, headers: { 'Cache-Control': 'no-store' } }
  );
}
