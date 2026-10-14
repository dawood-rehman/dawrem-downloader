/**
 * Formats duration in seconds to a user-friendly string (e.g. 03:45 or 01:12:30).
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) {
    return '00:00';
  }

  const sec = Math.floor(seconds);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSeconds = sec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }
  return `${pad(minutes)}:${pad(remainingSeconds)}`;
}

/**
 * Formats byte size into human readable string (KB, MB, GB).
 */
export function formatBytes(bytes?: number | null): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) {
    return 'Unknown size';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Sanitizes a title string into a safe file name across all operating systems.
 */
export function sanitizeFilename(name: string, fallback = 'media'): string {
  if (!name) return fallback;

  // Normalize smart quotes and dashes for broader filesystem compatibility
  let clean = name
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // Remove illegal filesystem characters: / \ ? % * : | " < > and control chars
    .replace(/[/\\?%*:|"<>]/g, '')
    .trim();

  // Replace multiple spaces or tabs
  clean = clean.replace(/\s+/g, ' ');

  // Truncate length
  if (clean.length > 80) {
    clean = clean.substring(0, 80).trim();
  }

  return clean || fallback;
}
