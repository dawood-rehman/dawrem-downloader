export class DownloaderError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly userMessage: string;

  constructor(message: string, code = 'DOWNLOADER_ERROR', statusCode = 400, userMessage?: string) {
    super(message);
    this.name = 'DownloaderError';
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage || message;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidUrlError extends DownloaderError {
  constructor(message = 'The provided URL is invalid or malformed.') {
    super(message, 'INVALID_URL', 400, 'Please enter a valid, complete web URL (e.g. https://...).');
  }
}

export class UnsupportedPlatformError extends DownloaderError {
  constructor(platform?: string) {
    const msg = platform
      ? `Platform '${platform}' is not supported.`
      : 'This link is from an unsupported platform.';
    super(
      msg,
      'UNSUPPORTED_PLATFORM',
      400,
      'DAWREM supports YouTube, Instagram, Facebook, TikTok, and Pinterest URLs.'
    );
  }
}

export class MediaUnavailableError extends DownloaderError {
  constructor(message = 'Media could not be found or has been deleted.') {
    super(
      message,
      'MEDIA_UNAVAILABLE',
      404,
      'This media is currently unavailable or has been removed by the creator.'
    );
  }
}

export class PrivateContentError extends DownloaderError {
  constructor(message = 'This content is private or requires authentication.') {
    super(
      message,
      'PRIVATE_CONTENT',
      403,
      'This media is private or restricted. DAWREM only accesses public media.'
    );
  }
}

export class DownloadNotPermittedError extends DownloaderError {
  constructor(message = 'Media download is not permitted for this content.') {
    super(
      message,
      'DOWNLOAD_NOT_PERMITTED',
      403,
      'Downloading is restricted or not authorized for this specific media.'
    );
  }
}

export class FileSizeLimitError extends DownloaderError {
  constructor(message = 'The requested media exceeds the maximum allowable size.') {
    super(
      message,
      'FILE_TOO_LARGE',
      413,
      'The requested file exceeds the size limit (500 MB) for processing.'
    );
  }
}

export class ProcessingFailedError extends DownloaderError {
  constructor(message = 'Media processing failed during audio/video conversion.') {
    super(
      message,
      'PROCESSING_FAILED',
      500,
      'We encountered an issue while processing or converting the media. Please try again.'
    );
  }
}

export class NetworkTimeoutError extends DownloaderError {
  constructor(message = 'The media server took too long to respond.') {
    super(
      message,
      'NETWORK_TIMEOUT',
      504,
      'The request timed out while communicating with the media server. Please try again.'
    );
  }
}

export class RateLimitError extends DownloaderError {
  constructor(message = 'Too many requests. Please slow down.') {
    super(
      message,
      'RATE_LIMIT_EXCEEDED',
      429,
      'Too many requests sent in a short period. Please wait a moment.'
    );
  }
}

export function formatErrorResponse(error: unknown) {
  if (error instanceof DownloaderError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
      },
    };
  }

  // Handle generic unknown error safely without leaking sensitive server traces
  console.error('[UNEXPECTED_SERVER_ERROR]:', error);
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while processing your request. Please try again later.',
    },
  };
}
