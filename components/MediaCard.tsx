'use client';

import React, { useState } from 'react';
import {
  Download,
  Clock,
  User,
  Video as VideoIcon,
  Music as MusicIcon,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { MediaAnalysisResult, MediaFormat } from '@/lib/platforms/types';
import { ProgressState } from './DownloadProgress';

interface MediaCardProps {
  media: MediaAnalysisResult;
  removeWatermark: boolean;
  onToggleWatermark: (val: boolean) => void;
  onSelectFormat: (format: MediaFormat) => void;
  onCancelDownload?: () => void;
  isDownloading: boolean;
  progressData?: ProgressState | null;
}

export function MediaCard({
  media,
  removeWatermark,
  onToggleWatermark,
  onSelectFormat,
  onCancelDownload,
  isDownloading,
  progressData,
}: MediaCardProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');

  const videoFormats = media.availableFormats.filter((f) => f.type === 'video' || f.type === 'image');
  const audioFormats = media.availableFormats.filter((f) => f.type === 'audio');

  // Filter formats by selected tab
  const currentTabFormats = activeTab === 'video' ? videoFormats : audioFormats;

  // Selected format state
  // Require an explicit user choice for every analyzed media item.
  const [selectedFormat, setSelectedFormat] = useState<MediaFormat | null>(null);

  // When tab changes, automatically select the first format of that tab if current selection doesn't match
  const handleTabChange = (tab: 'video' | 'audio') => {
    setActiveTab(tab);
    setSelectedFormat(null);
  };

  const handleRowClick = (fmt: MediaFormat) => {
    if (isDownloading) return;
    setSelectedFormat(fmt);
  };

  const handleDownloadClick = () => {
    if (selectedFormat && !isDownloading) {
      onSelectFormat(selectedFormat);
    }
  };

  // Helper to format quality tag
  const getQualityBadge = (fmt: MediaFormat, isSelected: boolean) => {
    const q = fmt.quality?.toLowerCase() || '';
    let badgeText = '';

    if (q.includes('4k') || q.includes('2160')) badgeText = '4K';
    else if (q.includes('2k') || q.includes('1440')) badgeText = '2K';
    else if (q.includes('1080')) badgeText = 'Full HD';
    else if (q.includes('720')) badgeText = 'HD';
    else if (q.includes('480')) badgeText = 'SD';
    else if (q.includes('320')) badgeText = '320 kbps';
    else if (q.includes('256')) badgeText = '256 kbps';
    else if (q.includes('192')) badgeText = '192 kbps';
    else if (q.includes('128')) badgeText = '128 kbps';

    if (!badgeText) return null;

    return (
      <span
        className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-all ${
          isSelected
            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
            : 'neu-pill text-zinc-500 dark:text-zinc-400'
        }`}
      >
        {badgeText}
      </span>
    );
  };

  const currentProgress = progressData?.formatId === selectedFormat?.formatId ? progressData : null;
  const isRunning = isDownloading && currentProgress && currentProgress.status !== 'Completed' && currentProgress.status !== 'Failed';
  const isCompleted = currentProgress?.status === 'Completed';
  const isFailed = currentProgress?.status === 'Failed';

  return (
    <div className="w-full neu-surface rounded-2xl p-4 sm:p-5 space-y-4 transition-all">
      {/* Top Preview Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Thumbnail Preview */}
        <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-zinc-100 dark:bg-slate-800 shrink-0 border border-zinc-200/60 dark:border-slate-700/60 shadow-sm">
          {media.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.thumbnail}
              alt={media.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              <VideoIcon className="w-8 h-8" />
            </div>
          )}

          {/* Duration Badge in bottom-right corner */}
          {media.formattedDuration && media.formattedDuration !== '00:00' && (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-mono text-white flex items-center space-x-1">
              <Clock className="w-2.5 h-2.5" />
              <span>{media.formattedDuration}</span>
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white line-clamp-2 leading-snug">
            {media.title}
          </h3>

          {/* Author Row */}
          <div className="flex items-center space-x-2 pt-0.5">
            <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-[10px] text-zinc-600 dark:text-zinc-300 shrink-0">
              <User className="w-3 h-3" />
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate">
              {media.author || 'Creator'}
            </span>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center space-x-2 text-xs text-zinc-400 dark:text-zinc-500">
            <span className="font-medium capitalize">{media.platformName}</span>
            <span>•</span>
            <span>Ready for high-speed download</span>
          </div>

          {/* Watermark toggle if supported */}
          {media.supportsWatermarkRemoval && selectedFormat?.hasWatermark && (
            <div className="pt-1.5 flex items-center space-x-2">
              <label className="inline-flex items-center space-x-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeWatermark}
                  onChange={(e) => onToggleWatermark(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-slate-700"
                />
                <span className="flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Remove Watermark</span>
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Select Format Header & Tabs */}
      <div className="pt-3 border-t border-zinc-200/60 dark:border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
            Select Format
          </h4>

          {/* Segmented Filter Pills: Video / Audio in Neumorphic Inset container */}
          <div className="neu-inset p-1 rounded-xl inline-flex space-x-1">
            <button
              type="button"
              onClick={() => handleTabChange('video')}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'video'
                  ? 'neu-blue-btn text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('audio')}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'audio'
                  ? 'neu-blue-btn text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <MusicIcon className="w-3.5 h-3.5" />
              <span>Audio</span>
            </button>
          </div>
        </div>

        {/* Format Options List with Radio Selectors */}
        <div className="space-y-1" role="radiogroup" aria-label={`${activeTab} download formats`}>
          {currentTabFormats.map((fmt) => {
            const isSelected = selectedFormat?.formatId === fmt.formatId;

            return (
              <div
                key={fmt.formatId}
                role="radio"
                aria-checked={isSelected}
                aria-disabled={isDownloading}
                tabIndex={isSelected || (!selectedFormat && currentTabFormats[0]?.formatId === fmt.formatId) ? 0 : -1}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowClick(fmt);
                  } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    if (isDownloading || !currentTabFormats.length) return;
                    const currentIndex = currentTabFormats.findIndex((item) => item.formatId === fmt.formatId);
                    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
                    const nextFormat = currentTabFormats[(currentIndex + direction + currentTabFormats.length) % currentTabFormats.length];
                    setSelectedFormat(nextFormat);
                    document.getElementById(`format-${CSS.escape(nextFormat.formatId)}`)?.focus();
                  }
                }}
                onClick={() => handleRowClick(fmt)}
                id={`format-${fmt.formatId}`}
                className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition cursor-pointer border-b border-zinc-200/50 dark:border-slate-800/60 last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isSelected
                    ? 'bg-blue-500/10 dark:bg-blue-950/25'
                    : 'hover:bg-zinc-100/50 dark:hover:bg-slate-800/30'
                }`}
              >
                {/* Left side: Radio + Ext + Quality + Badge */}
                <div className="flex items-center space-x-4">
                  {/* Neumorphic Radio Button */}
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {isSelected ? (
                      <div className="neu-radio-selected w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      </div>
                    ) : (
                      <div className="neu-radio-unselected w-4 h-4 rounded-full border border-zinc-300 dark:border-slate-700" />
                    )}
                  </div>

                  {/* Format Extension */}
                  <span className="text-xs sm:text-sm font-bold uppercase font-mono text-zinc-900 dark:text-white w-10 shrink-0">
                    {fmt.extension || (fmt.type === 'video' ? 'MP4' : 'MP3')}
                  </span>

                  {/* Quality / Resolution */}
                  <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 w-14 sm:w-16 shrink-0">
                    {fmt.quality || (fmt.type === 'video' ? '720p' : '128 kbps')}
                  </span>

                  {/* Quality Tag Badge */}
                  <div>{getQualityBadge(fmt, isSelected)}</div>
                </div>

                {/* Right side: File Size Estimate */}
                <div className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 font-mono">
                  {fmt.fileSizeEstimate || 'Standard'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Progress Bar (rendered inside card if active) */}
        {isDownloading && currentProgress && (
          <div className="pt-2 pb-1 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-zinc-600 dark:text-zinc-300 flex items-center space-x-1.5">
                {isRunning && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                <span>
                  {isCompleted
                    ? 'Download Complete'
                    : isFailed
                    ? 'Failed'
                    : currentProgress.status === 'Processing'
                    ? 'Merging video & audio...'
                    : `Downloading (${currentProgress.speedFormatted || '0 KB/s'})...`}
                </span>
              </span>
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {Math.round(currentProgress.progress)}%
              </span>
            </div>

            {/* Neumorphic Inset Track with Blue Fill */}
            <div className="w-full h-2.5 neu-inset rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full transition-all duration-300 ease-out rounded-full ${
                  isCompleted
                    ? 'bg-emerald-500'
                    : isFailed
                    ? 'bg-red-500'
                    : 'neu-blue-btn'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, currentProgress.progress))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
              <span>Downloaded: {currentProgress.downloadedFormatted}</span>
              <span>Total: {currentProgress.totalFormatted}</span>
            </div>
            {onCancelDownload && (
              <button
                type="button"
                onClick={onCancelDownload}
                disabled={currentProgress.jobId === 'init'}
                className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Cancel download
              </button>
            )}
          </div>
        )}

        {/* Big Bottom Action Button */}
        {!selectedFormat && (
          <p role="status" className="mt-3 rounded-xl bg-zinc-100 px-3 py-2.5 text-center text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Select a format above to enable the download button.
          </p>
        )}
        {selectedFormat && (
          isCompleted && currentProgress?.downloadUrl ? (
            <a
              href={currentProgress.downloadUrl}
              download={currentProgress.fileName || 'media'}
              className="neu-blue-btn w-full py-3.5 px-6 rounded-2xl text-white font-semibold text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer mt-3"
            >
              <span className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4" /><span>Save File to Device</span></span>
              <span className="font-mono text-xs opacity-90">{selectedFormat.fileSizeEstimate || 'Ready'}</span>
            </a>
          ) : (
          <button
            type="button"
            onClick={handleDownloadClick}
            disabled={isDownloading}
            className="neu-blue-btn w-full py-3.5 px-6 rounded-2xl text-white font-semibold text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3"
          >
            {/* Left/Center label with Download Icon */}
            <div className="flex items-center space-x-2">
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>
                {isCompleted
                  ? 'Save File to Disk'
                  : isRunning
                  ? `Downloading ${selectedFormat.type === 'image' ? 'Image' : selectedFormat.type === 'video' ? 'Video' : 'Audio'} (${selectedFormat.quality || 'Standard'})...`
                  : isFailed || currentProgress?.status === 'Cancelled'
                  ? `Retry ${selectedFormat.type === 'image' ? 'Image' : selectedFormat.type === 'video' ? 'Video' : 'Audio'} Download`
                  : `Download ${selectedFormat.type === 'image' ? 'Image' : selectedFormat.type === 'video' ? 'Video' : 'Audio'} (${selectedFormat.quality || 'Standard'})`}
              </span>
            </div>

            {/* Right size badge */}
            <span className="font-mono text-xs opacity-90">
              {selectedFormat.fileSizeEstimate || 'Instant'}
            </span>
          </button>
          )
        )}
      </div>
    </div>
  );
}
