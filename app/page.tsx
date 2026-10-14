'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Navbar } from '@/components/Navbar';
import { PlatformBadges } from '@/components/PlatformBadges';
import { MediaCard } from '@/components/MediaCard';
import { ProgressState } from '@/components/DownloadProgress';
import { ErrorBanner } from '@/components/ErrorBanner';
import { SettingsModal } from '@/components/SettingsModal';
import { ProfileSection } from '@/components/ProfileSection';
import { AdsterraSlot } from '@/components/AdsterraSlot';
import { RecentDownloads, RecentDownload } from '@/components/RecentDownloads';
import { detectPlatform } from '@/lib/platforms/detector';
import { MediaAnalysisResult, MediaFormat } from '@/lib/platforms/types';
import { SupportedPlatform } from '@/lib/config';
import { Download, Loader2, Link2, X, PlaySquare, Users } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'single' | 'profile'>('single');
  const [url, setUrl] = useState('');
  const detectedPlatform = useMemo<SupportedPlatform | null>(
    () => (url.trim() ? detectPlatform(url) : null),
    [url]
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [removeWatermarkDefault, setRemoveWatermarkDefault] = useState(false);

  // Optional session credentials stay in memory only and are cleared on refresh.
  const [instagramCookie, setInstagramCookie] = useState('');
  const [facebookCookie, setFacebookCookie] = useState('');

  // Analysis state for Single Media
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mediaResult, setMediaResult] = useState<MediaAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Download state for Single Media
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState | null>(null);
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([]);
  const progressPollingRef = useRef<NodeJS.Timeout | null>(null);

  const handleSaveIgCookie = (val: string) => {
    setInstagramCookie(val);
  };

  const handleSaveFbCookie = (val: string) => {
    setFacebookCookie(val);
  };

  // Clean polling on unmount
  useEffect(() => {
    return () => {
      if (progressPollingRef.current) {
        clearInterval(progressPollingRef.current);
      }
    };
  }, []);

  // Submit URL for real analysis in Single Media mode
  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || isAnalyzing) return;

    setErrorMessage(null);
    setMediaResult(null);
    setProgressState(null);
    setIsAnalyzing(true);

    try {
      const response = await axios.post('/api/analyze', { url: url.trim() });

      if (response.data?.success && response.data?.data) {
        setMediaResult(response.data.data);
      } else {
        throw new Error(response.data?.error?.message || 'Unable to fetch media info.');
      }
    } catch (err: unknown) {
      const errObj = (err as any)?.response?.data?.error;
      const message =
        errObj?.message ||
        (err as Error)?.message ||
        'Could not analyze this URL. Please verify the link and try again.';
      setErrorMessage(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger real format download
  const handleStartDownload = async (format: MediaFormat) => {
    if (!mediaResult || isDownloading) return;

    setIsDownloading(true);
    setErrorMessage(null);

    // Initial progress preview
    setProgressState({
      jobId: 'init',
      formatId: format.formatId,
      status: 'Preparing',
      progress: 5,
      downloadedFormatted: '0 MB',
      totalFormatted: format.fileSizeEstimate || 'Calculating...',
      speedFormatted: '0 KB/s',
      fileName: `${mediaResult.title}.${format.extension}`,
    });

    try {
      const response = await axios.post('/api/download', {
        url: mediaResult.url,
        formatId: format.formatId,
        platform: mediaResult.platform,
        removeWatermark: format.hasWatermark ? removeWatermarkDefault : false,
      });

      if (!response.data?.success || !response.data?.data?.jobId) {
        throw new Error(response.data?.error?.message || 'Failed to start download job.');
      }

      const jobId = response.data.data.jobId;

      // Start live progress polling (fast 400ms interval for fluid UI updates)
      if (progressPollingRef.current) clearInterval(progressPollingRef.current);

      let consecutiveErrors = 0;
      progressPollingRef.current = setInterval(async () => {
        try {
          const pollRes = await axios.get(`/api/download/progress?id=${jobId}`);
          consecutiveErrors = 0;
          if (pollRes.data?.success && pollRes.data?.data) {
            const data = pollRes.data.data;
            setProgressState({
              jobId: data.id,
              formatId: data.formatId,
              status: data.status,
              progress: data.progress,
              downloadedFormatted: data.downloadedFormatted,
              totalFormatted: data.totalFormatted,
              speedFormatted: data.speedFormatted,
              fileName: data.fileName,
              downloadUrl: data.downloadUrl,
              error: data.error,
            });

            if (data.status === 'Completed' || data.status === 'Failed' || data.status === 'Cancelled') {
              if (progressPollingRef.current) {
                clearInterval(progressPollingRef.current);
                progressPollingRef.current = null;
              }
              setIsDownloading(false);

              if (data.status === 'Completed') {
                setRecentDownloads((items) => [
                  {
                    id: data.id,
                    fileName: data.fileName || 'media',
                    format: format.extension.toUpperCase(),
                    completedAt: new Date().toLocaleTimeString(),
                  },
                  ...items.filter((item) => item.id !== data.id),
                ].slice(0, 5));
              }

              // The user explicitly starts the file transfer from the completed state.
            }
          }
        } catch {
          consecutiveErrors++;
          // If disconnected for > 6 seconds (15 failed polls)
          if (consecutiveErrors >= 15) {
            if (progressPollingRef.current) {
              clearInterval(progressPollingRef.current);
              progressPollingRef.current = null;
            }
            setIsDownloading(false);
            setProgressState((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'Failed',
                    error: 'Connection to download server was lost. Please retry.',
                  }
                : null
            );
          }
        }
      }, 800);
    } catch (err: unknown) {
      const errObj = (err as any)?.response?.data?.error;
      const message =
        errObj?.message || (err as Error)?.message || 'Failed to start download.';
      setErrorMessage(message);
      setIsDownloading(false);
      setProgressState((prev) =>
        prev
          ? {
              ...prev,
              status: 'Failed',
              error: message,
            }
          : null
      );
    }
  };

  const handleCancelDownload = async () => {
    const jobId = progressState?.jobId;
    if (!jobId || jobId === 'init') return;

    try {
      await axios.post(`/api/download/cancel?id=${encodeURIComponent(jobId)}`);
      if (progressPollingRef.current) {
        clearInterval(progressPollingRef.current);
        progressPollingRef.current = null;
      }
      setIsDownloading(false);
      setProgressState((previous) => previous ? {
        ...previous,
        status: 'Cancelled',
        error: 'Download cancelled.',
      } : null);
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.error?.message || 'Could not cancel this download. Please try again.';
      setErrorMessage(message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 bg-[#e9eef5] dark:bg-[#090d16] transition-colors py-10 sm:py-14">
      {/* Central Neumorphic Card Container matching reference image */}
      <div className="w-full max-w-2xl neu-card rounded-[32px] p-5 sm:p-8 space-y-6 transition-all">
        {/* Top Header */}
        <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />

        {/* View Mode Switcher Pills (Single Video vs Profile / Channel) */}
        <div className="flex items-center justify-center pt-1">
          <div className="neu-inset p-1.5 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('single');
                setErrorMessage(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'single'
                  ? 'neu-pill text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <PlaySquare className="w-4 h-4" />
              <span>Single Media</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                setErrorMessage(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'neu-pill text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Profile & Channels</span>
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-2 pt-1 sm:pt-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            {activeTab === 'single' ? 'Download Videos Easily' : 'Explore & Download Profiles'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            {activeTab === 'single'
              ? 'Analyze a YouTube, TikTok, Instagram, Facebook, or Pinterest link and review available formats.'
              : 'Enter any username, profile link, or channel/playlist URL to inspect and batch download.'}
          </p>
        </div>

        {/* Tab 1: Single Media Mode */}
        {activeTab === 'single' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Input Bar Form */}
            <form onSubmit={handleAnalyze} className="w-full">
              <div className="relative flex items-center neu-inset rounded-2xl p-1.5 pl-4 transition-all focus-within:ring-2 focus-within:ring-blue-500/40">
                {/* Input Left Icon */}
                <Link2 className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />

                {/* Input Field */}
                <input
                  aria-label="Media URL"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  autoComplete="url"
                  spellCheck={false}
                  disabled={isAnalyzing}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm bg-transparent border-none focus:outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                />

                {/* Clear Button */}
                {url ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUrl('');
                      setMediaResult(null);
                      setErrorMessage(null);
                      setProgressState(null);
                    }}
                    aria-label="Clear URL"
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mr-1.5 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}

                {/* Download/Analyze Action Button */}
                <button
                  type="submit"
                  disabled={!url.trim() || isAnalyzing}
                  className="px-5 py-2.5 neu-blue-btn text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Analyze Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Supported Platforms Badges Row */}
            <PlatformBadges activePlatform={detectedPlatform} />

            {/* Error Banner */}
            {errorMessage && (
              <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
            )}

            {/* Real Analyzed Media Card (Rendered only with real fetched data - NO MOCK DATA) */}
            {mediaResult && (
              <MediaCard
              key={mediaResult.url}
                media={mediaResult}
                removeWatermark={removeWatermarkDefault}
                onToggleWatermark={setRemoveWatermarkDefault}
                onSelectFormat={handleStartDownload}
                onCancelDownload={handleCancelDownload}
                isDownloading={isDownloading}
                progressData={progressState}
              />
            )}
          </div>
        )}

        {/* Tab 2: Profile & Channels Mode */}
        {activeTab === 'profile' && (
          <div className="animate-fadeIn">
            <ProfileSection
              sessionCookies={{ instagram: instagramCookie, facebook: facebookCookie }}
            />
          </div>
        )}
      </div>

      <AdsterraSlot />

      <RecentDownloads items={recentDownloads} onClear={() => setRecentDownloads([])} />

      <footer className="w-full max-w-2xl px-3 sm:px-6 pb-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <nav aria-label="Legal and support" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <a className="hover:text-blue-600 hover:underline" href="/about">About</a>
          <a className="hover:text-blue-600 hover:underline" href="/guide">Guide</a>
          <a className="hover:text-blue-600 hover:underline" href="/privacy">Privacy</a>
          <a className="hover:text-blue-600 hover:underline" href="/terms">Terms</a>
          <a className="hover:text-blue-600 hover:underline" href="/copyright">Copyright</a>
          <a className="hover:text-blue-600 hover:underline" href="/contact">Contact</a>
        </nav>
        <p className="mt-3">Use this service only for media you own or are authorized to download.</p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        removeWatermarkDefault={removeWatermarkDefault}
        setRemoveWatermarkDefault={setRemoveWatermarkDefault}
        instagramCookie={instagramCookie}
        setInstagramCookie={handleSaveIgCookie}
        facebookCookie={facebookCookie}
        setFacebookCookie={handleSaveFbCookie}
      />
    </div>
  );
}
