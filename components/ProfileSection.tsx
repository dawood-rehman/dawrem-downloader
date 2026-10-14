'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { ProfilePlatform, ProfileFetchResult, ProfileMediaItem } from '@/lib/profiles/types';
import { detectProfileInput } from '@/lib/profiles/detector';
import { ProfileHeader } from './ProfileHeader';
import { ProfileMediaGrid } from './ProfileMediaGrid';
import { BatchDownloadModal, BatchItemStatus } from './BatchDownloadModal';
import { ErrorBanner } from './ErrorBanner';
import { Search, Loader2, X, Sparkles, Youtube, Instagram, Facebook } from 'lucide-react';

interface ProfileSectionProps {
  sessionCookies?: Partial<Record<ProfilePlatform, string>>;
}

export function ProfileSection({ sessionCookies = {} }: ProfileSectionProps) {
  const [query, setQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<ProfilePlatform | 'auto'>('auto');
  const [isFetching, setIsFetching] = useState(false);
  const [profileResult, setProfileResult] = useState<ProfileFetchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pagination state
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Single download state
  const [downloadingItemId, setDownloadingItemId] = useState<string | undefined>();

  // Batch download state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchQueue, setBatchQueue] = useState<BatchItemStatus[]>([]);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Platform tabs configuration
  const platforms: Array<{ id: ProfilePlatform | 'auto'; label: string; icon?: React.ReactNode }> = [
    { id: 'auto', label: 'Auto Detect' },
    { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-3.5 h-3.5 text-red-500" /> },
    { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-3.5 h-3.5 text-pink-500" /> },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'facebook', label: 'Facebook', icon: <Facebook className="w-3.5 h-3.5 text-blue-600" /> },
    { id: 'pinterest', label: 'Pinterest' },
  ];

  const getPlaceholder = () => {
    switch (selectedPlatform) {
      case 'youtube':
        return 'Enter channel URL, @handle (e.g. @MrBeast) or playlist...';
      case 'instagram':
        return 'Enter Instagram username (e.g. nasa) or profile link...';
      case 'tiktok':
        return 'Enter TikTok username (e.g. @tiktok) or profile link...';
      case 'facebook':
        return 'Enter Facebook page/user username or profile URL...';
      case 'pinterest':
        return 'Enter Pinterest username (e.g. pinterest) or profile URL...';
      default:
        return 'Enter username, @handle, profile URL, channel or playlist...';
    }
  };

  const getSessionCookie = (platform?: ProfilePlatform) => {
    const target = platform || detectProfileInput(
      query,
      selectedPlatform === 'auto' ? undefined : selectedPlatform
    ).platform;
    return target ? sessionCookies[target] : undefined;
  };

  // Fetch initial profile
  const handleFetchProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isFetching) return;

    setErrorMessage(null);
    setProfileResult(null);
    setIsFetching(true);

    try {
      const res = await axios.post('/api/profile', {
        query: query.trim(),
        platform: selectedPlatform !== 'auto' ? selectedPlatform : undefined,
        limit: 24,
        sessionCookie: getSessionCookie(),
      });

      if (res.data?.success && res.data?.data) {
        setProfileResult(res.data.data);
      } else {
        throw new Error(res.data?.error?.message || 'Failed to fetch profile.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Could not fetch profile. Please verify the username or link and try again.';
      setErrorMessage(msg);
    } finally {
      setIsFetching(false);
    }
  };

  // Load more pagination
  const handleLoadMore = async () => {
    if (!profileResult || !profileResult.hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const res = await axios.post('/api/profile', {
        query: query.trim(),
        platform: profileResult.profile.platform,
        cursor: profileResult.nextCursor,
        limit: 24,
        sessionCookie: getSessionCookie(profileResult.profile.platform),
      });

      if (res.data?.success && res.data?.data) {
        const moreData = res.data.data as ProfileFetchResult;
        setProfileResult((prev) => {
          if (!prev) return moreData;
          return {
            ...prev,
            items: [...prev.items, ...moreData.items],
            nextCursor: moreData.nextCursor,
            hasMore: moreData.hasMore,
          };
        });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to load more media items.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Helper to trigger direct file download
  const triggerDownload = async (fileUrl: string, fileName: string) => {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', fileName);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Trigger single item download
  const handleSingleDownload = async (item: ProfileMediaItem) => {
    if (downloadingItemId) return;

    setDownloadingItemId(item.id);
    try {
      // If direct download URL already available (e.g. high-res image / pin or direct mp4)
      const isDirectMp4 = item.directDownloadUrl?.includes('.mp4');
      const isDirectEligible =
        item.directDownloadUrl &&
        (item.mediaType !== 'reel' && item.mediaType !== 'video' || isDirectMp4) &&
        !item.url.includes('youtube.com');

      if (isDirectEligible && item.directDownloadUrl) {
        const ext = isDirectMp4 ? 'mp4' : 'jpg';
        const cleanName = `${(item.author || 'media').replace(/[^a-zA-Z0-9]/g, '_')}_${item.id}.${ext}`;
        await triggerDownload(item.directDownloadUrl, cleanName);
        setDownloadingItemId(undefined);
        return;
      }

      // Launch download job
      const res = await axios.post('/api/download', {
        url: item.url,
        formatId: 'video-best',
        platform: profileResult?.profile.platform || 'youtube',
      });

      if (res.data?.success && res.data?.data?.jobId) {
        const jobId = res.data.data.jobId;
        // Poll till complete
        const pollTimer = setInterval(async () => {
          try {
            const pRes = await axios.get(`/api/download/progress?id=${jobId}`);
            if (pRes.data?.success && pRes.data?.data) {
              const pData = pRes.data.data;
              if (pData.status === 'Completed' && pData.downloadUrl) {
                clearInterval(pollTimer);
                setDownloadingItemId(undefined);
                const link = document.createElement('a');
                link.href = pData.downloadUrl;
                link.setAttribute('download', pData.fileName || 'media');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else if (pData.status === 'Failed') {
                clearInterval(pollTimer);
                setDownloadingItemId(undefined);
                setErrorMessage(`Download failed for "${item.title}": ${pData.error || 'Server error'}`);
              }
            }
          } catch {
            clearInterval(pollTimer);
            setDownloadingItemId(undefined);
          }
        }, 600);
      } else {
        throw new Error(res.data?.error?.message || 'Failed to initiate download.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Download failed.');
      setDownloadingItemId(undefined);
    }
  };

  // Trigger batch download
  const handleBatchDownload = async (selectedItems: ProfileMediaItem[]) => {
    if (selectedItems.length === 0 || isBatchProcessing) return;

    const initialQueue: BatchItemStatus[] = selectedItems.map((item) => ({
      item,
      status: 'queued',
    }));

    setBatchQueue(initialQueue);
    setBatchCurrentIndex(0);
    setBatchModalOpen(true);
    setIsBatchProcessing(true);

    // Process sequentially
    for (let i = 0; i < initialQueue.length; i++) {
      setBatchCurrentIndex(i);
      setBatchQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: 'downloading' } : q))
      );

      const current = initialQueue[i];

      try {
        const isDirectMp4 = current.item.directDownloadUrl?.includes('.mp4');
        const isDirectEligible =
          current.item.directDownloadUrl &&
          (current.item.mediaType !== 'reel' && current.item.mediaType !== 'video' || isDirectMp4) &&
          !current.item.url.includes('youtube.com');

        if (isDirectEligible && current.item.directDownloadUrl) {
          // Direct file download
          const ext = isDirectMp4 ? 'mp4' : 'jpg';
          const cleanName = `${(current.item.author || 'media').replace(/[^a-zA-Z0-9]/g, '_')}_${current.item.id}.${ext}`;
          await triggerDownload(current.item.directDownloadUrl, cleanName);

          setBatchQueue((prev) =>
            prev.map((q, idx) => (idx === i ? { ...q, status: 'completed' } : q))
          );
        } else {
          // Backend job download
          const res = await axios.post('/api/download', {
            url: current.item.url,
            formatId: 'video-best',
            platform: profileResult?.profile.platform || 'youtube',
          });

          if (res.data?.success && res.data?.data?.jobId) {
            const jobId = res.data.data.jobId;
            await new Promise<void>((resolve) => {
              let attempts = 0;
              const timer = setInterval(async () => {
                attempts++;
                try {
                  const pRes = await axios.get(`/api/download/progress?id=${jobId}`);
                  if (pRes.data?.success && pRes.data?.data) {
                    const pData = pRes.data.data;
                    if (pData.status === 'Completed') {
                      clearInterval(timer);
                      if (pData.downloadUrl) {
                        const link = document.createElement('a');
                        link.href = pData.downloadUrl;
                        link.setAttribute('download', pData.fileName || 'media');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                      setBatchQueue((prev) =>
                        prev.map((q, idx) => (idx === i ? { ...q, status: 'completed' } : q))
                      );
                      resolve();
                    } else if (pData.status === 'Failed' || attempts > 300) {
                      clearInterval(timer);
                      setBatchQueue((prev) =>
                        prev.map((q, idx) =>
                          idx === i ? { ...q, status: 'failed', error: pData.error || 'Failed' } : q
                        )
                      );
                      resolve();
                    }
                  }
                } catch {
                  clearInterval(timer);
                  setBatchQueue((prev) =>
                    prev.map((q, idx) => (idx === i ? { ...q, status: 'failed' } : q))
                  );
                  resolve();
                }
              }, 600);
            });
          } else {
            throw new Error(res.data?.error?.message || 'Download failed');
          }
        }
      } catch (itemErr: any) {
        setBatchQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: 'failed', error: itemErr.message } : q
          )
        );
      }

      // Small pause between downloads
      await new Promise((r) => setTimeout(r, 400));
    }

    setIsBatchProcessing(false);
  };

  return (
    <div className="w-full space-y-6">
      {/* Platform Selector Tabs */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {platforms.map((p) => {
          const isActive = selectedPlatform === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlatform(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'neu-pill text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/40 shadow-inner'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile Search Bar */}
      <form onSubmit={handleFetchProfile} className="w-full">
        <div className="relative flex items-center neu-inset rounded-2xl p-1.5 pl-4 transition-all focus-within:ring-2 focus-within:ring-blue-500/40">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />

          <input
            aria-label="Profile username or URL"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={getPlaceholder()}
            disabled={isFetching}
            className="w-full px-2.5 py-2 text-xs sm:text-sm bg-transparent border-none focus:outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setProfileResult(null);
                setErrorMessage(null);
              }}
              aria-label="Clear query"
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mr-1.5 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}

          <button
            type="submit"
            disabled={!query.trim() || isFetching}
            className="px-5 py-2.5 neu-blue-btn text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fetch Profile</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Banner */}
      {errorMessage && (
        <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      {/* Real Fetched Profile Section (NO MOCK DATA) */}
      {profileResult && (
        <div className="space-y-4 pt-1 animate-fadeIn">
          {/* Profile Overview Card */}
          <ProfileHeader
            profile={profileResult.profile}
            warning={profileResult.warning}
            onApplyCookie={async (newCookie) => {
              setErrorMessage(null);
              setIsFetching(true);
              try {
                const res = await axios.post('/api/profile', {
                  query: query.trim(),
                  platform: profileResult.profile.platform,
                  limit: 24,
                  sessionCookie: newCookie,
                });
                if (res.data?.success && res.data?.data) {
                  setProfileResult(res.data.data);
                } else {
                  throw new Error(res.data?.error?.message || 'Failed with session cookie');
                }
              } catch (err: any) {
                setErrorMessage(err.response?.data?.error?.message || err.message || 'Cookie invalid.');
              } finally {
                setIsFetching(false);
              }
            }}
          />

          {/* Media Items Grid & Batch Selection */}
          <ProfileMediaGrid
            key={profileResult.profile.profileUrl}
            items={profileResult.items}
            onDownloadSingle={handleSingleDownload}
            onDownloadBatch={handleBatchDownload}
            downloadingItemId={downloadingItemId}
            hasMore={profileResult.hasMore}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
          />
        </div>
      )}

      {/* Batch Download Modal */}
      <BatchDownloadModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        items={batchQueue}
        currentIndex={batchCurrentIndex}
        isProcessing={isBatchProcessing}
      />
    </div>
  );
}
