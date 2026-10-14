'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  X,
} from 'lucide-react';
import { JobStatus } from '@/lib/media/download-job';

export interface ProgressState {
  jobId: string;
  formatId?: string;
  status: JobStatus;
  progress: number;
  downloadedFormatted: string;
  totalFormatted: string;
  speedFormatted: string;
  fileName?: string;
  downloadUrl?: string | null;
  error?: string;
}

interface DownloadProgressProps {
  progressData: ProgressState;
  onDismiss: () => void;
}

export function DownloadProgress({ progressData, onDismiss }: DownloadProgressProps) {
  const {
    status,
    progress,
    downloadedFormatted,
    totalFormatted,
    speedFormatted,
    fileName,
    downloadUrl,
    error,
  } = progressData;

  const isCompleted = status === 'Completed';
  const isFailed = status === 'Failed';
  const isRunning = !isCompleted && !isFailed;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm transition-all space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {isRunning && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
          {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          {isFailed && <AlertTriangle className="w-5 h-5 text-red-500" />}

          <div>
            <h4 role="status" aria-live="polite" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {isCompleted ? 'Download Complete' : isFailed ? 'Download Failed' : `Status: ${status}`}
            </h4>
            {fileName && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-xs sm:max-w-md">
                {fileName}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onDismiss}
          aria-label="Dismiss download status"
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-zinc-600 dark:text-zinc-400">
            {isCompleted
              ? 'Your file is ready to save'
              : isFailed
              ? 'Operation aborted'
              : status === 'Processing'
              ? 'Finalizing conversion & filter graph...'
              : 'Transferring media data...'}
          </span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400">
            {Math.round(progress)}%
          </span>
        </div>

        <div
          className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Download progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.max(0, Math.round(progress)))}
        >
          <div
            className={`h-full transition-all duration-300 ease-out rounded-full ${
              isCompleted
                ? 'bg-emerald-500'
                : isFailed
                ? 'bg-red-500'
                : 'bg-indigo-600 dark:bg-indigo-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800 text-center">
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
          <span className="block text-[10px] uppercase font-semibold text-zinc-400">
            Downloaded
          </span>
          <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
            {downloadedFormatted || '0 MB'}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
          <span className="block text-[10px] uppercase font-semibold text-zinc-400">
            Total Size
          </span>
          <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
            {totalFormatted || 'Calculating...'}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
          <span className="block text-[10px] uppercase font-semibold text-zinc-400">Speed</span>
          <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
            {speedFormatted || '-- KB/s'}
          </span>
        </div>
      </div>

      {/* Completed Action */}
      {isCompleted && downloadUrl && (
        <div className="pt-2">
          <a
            href={downloadUrl}
            download={fileName || 'media'}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Save to Your Device</span>
          </a>
        </div>
      )}

      {/* Failed Error Details */}
      {isFailed && error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
