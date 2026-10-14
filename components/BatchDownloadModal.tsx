'use client';

import React from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, DownloadCloud } from 'lucide-react';
import { ProfileMediaItem } from '@/lib/profiles/types';

export interface BatchItemStatus {
  item: ProfileMediaItem;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  error?: string;
  downloadUrl?: string;
}

interface BatchDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BatchItemStatus[];
  currentIndex: number;
  isProcessing: boolean;
}

export function BatchDownloadModal({
  isOpen,
  onClose,
  items,
  currentIndex,
  isProcessing,
}: BatchDownloadModalProps) {
  if (!isOpen) return null;

  const total = items.length;
  const completed = items.filter((i) => i.status === 'completed').length;
  const failed = items.filter((i) => i.status === 'failed').length;
  const percent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg neu-card rounded-3xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200/50 dark:border-zinc-800/60">
          <div className="flex items-center space-x-2">
            <DownloadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 id="batch-dialog-title" className="text-base font-bold text-zinc-900 dark:text-white">
              Batch Download Queue
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-2 neu-surface p-3.5 rounded-2xl">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {isProcessing
                ? `Downloading item ${Math.min(currentIndex + 1, total)} of ${total}...`
                : completed === total
                ? 'All downloads completed!'
                : `Batch finished (${completed} succeeded, ${failed} failed)`}
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{percent}%</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden neu-inset p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Queue Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72">
          {items.map((entry, idx) => (
            <div
              key={entry.item.id + idx}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                entry.status === 'downloading'
                  ? 'neu-surface border-blue-500/50 ring-1 ring-blue-500/30'
                  : 'bg-white/40 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/50'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-800">
                  {entry.item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.item.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400">
                      IMG
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-white truncate">
                    {entry.item.title}
                  </p>
                  <p className="text-[10px] text-zinc-400 capitalize">
                    {entry.item.mediaType}
                    {entry.item.durationFormatted ? ` • ${entry.item.durationFormatted}` : ''}
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0 flex items-center">
                {entry.status === 'queued' && (
                  <span className="text-[11px] text-zinc-400 font-medium px-2 py-0.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800">
                    Queued
                  </span>
                )}
                {entry.status === 'downloading' && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium px-2 py-0.5 rounded-full bg-blue-500/10 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing</span>
                  </span>
                )}
                {entry.status === 'completed' && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Done</span>
                  </span>
                )}
                {entry.status === 'failed' && (
                  <span
                    title={entry.error || 'Failed'}
                    className="text-[11px] text-red-500 font-medium px-2 py-0.5 rounded-full bg-red-500/10 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>Failed</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-between items-center border-t border-zinc-200/50 dark:border-zinc-800/60">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Files download automatically to your device.
          </p>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 neu-pill rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Processing in Background...' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
