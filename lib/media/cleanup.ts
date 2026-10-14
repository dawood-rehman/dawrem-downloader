import fs from 'fs';
import path from 'path';
import { APP_CONFIG } from '../config';

/**
 * Ensures the temporary downloads directory exists.
 */
export function ensureTempDir(): string {
  const dir = APP_CONFIG.tempDir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Safely removes a file if it exists, without throwing unhandled exceptions.
 */
export async function removeTempFile(filePath: string): Promise<boolean> {
  try {
    if (!filePath) return false;

    // Path traversal check: Ensure filePath is within APP_CONFIG.tempDir
    const resolvedPath = path.resolve(filePath);
    const resolvedTempDir = path.resolve(APP_CONFIG.tempDir);

    if (resolvedPath !== resolvedTempDir && !resolvedPath.startsWith(`${resolvedTempDir}${path.sep}`)) {
      console.warn(`[CLEANUP_BLOCKED] Attempted to delete file outside temp directory: ${resolvedPath}`);
      return false;
    }

    if (fs.existsSync(resolvedPath)) {
      await fs.promises.unlink(resolvedPath);
      return true;
    }
  } catch (err) {
    console.warn(`[CLEANUP_WARN] Failed to delete temp file ${filePath}:`, err);
  }
  return false;
}

/**
 * Removes multiple files safely.
 */
export async function removeTempFiles(filePaths: string[]): Promise<void> {
  await Promise.allSettled(filePaths.map((p) => removeTempFile(p)));
}

/**
 * Sweeps the temporary directory and deletes files older than TTL (15 minutes).
 */
export async function cleanExpiredTempFiles(): Promise<number> {
  try {
    const dir = ensureTempDir();
    const files = await fs.promises.readdir(dir);
    const now = Date.now();
    let cleanedCount = 0;

    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stats = await fs.promises.stat(fullPath);
        if (now - stats.mtimeMs > APP_CONFIG.tempFileTtlMs) {
          await fs.promises.unlink(fullPath);
          cleanedCount++;
        }
      } catch {
        // file might have been removed concurrently
      }
    }

    return cleanedCount;
  } catch (err) {
    console.error('[CLEANUP_ERROR] Error cleaning expired temp files:', err);
    return 0;
  }
}
