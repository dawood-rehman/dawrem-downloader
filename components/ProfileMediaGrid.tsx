'use client';

import React, { useState, useMemo } from 'react';
import { ProfileMediaItem, ProfileContentType } from '@/lib/profiles/types';
import {
  Download,
  Film,
  Image as ImageIcon,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Loader2,
  ExternalLink,
  Flame,
  Bookmark,
} from 'lucide-react';

interface ProfileMediaGridProps {
  items: ProfileMediaItem[];
  onDownloadSingle: (item: ProfileMediaItem) => void;
  onDownloadBatch: (selectedItems: ProfileMediaItem[]) => void;
  downloadingItemId?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function ProfileMediaGrid({
  items,
  onDownloadSingle,
  onDownloadBatch,
  downloadingItemId,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: ProfileMediaGridProps) {
  const [selectedFilter, setSelectedFilter] = useState<ProfileContentType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Count items by category for filter pills
  const counts = useMemo(() => {
    return {
      all: items.length,
      video: items.filter((i) => i.mediaType === 'video').length,
      reel: items.filter((i) => i.mediaType === 'reel').length,
      image: items.filter((i) => i.mediaType === 'image' || i.mediaType === 'pin' || i.mediaType === 'post').length,
      story: items.filter((i) => i.mediaType === 'story').length,
      highlight: items.filter((i) => i.mediaType === 'highlight').length,
    };
  }, [items]);

  // Filter items based on active tab
  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return items;
    if (selectedFilter === 'video') {
      return items.filter((i) => i.mediaType === 'video');
    }
    if (selectedFilter === 'image' || selectedFilter === 'pin') {
      return items.filter((i) => i.mediaType === 'image' || i.mediaType === 'pin' || i.mediaType === 'post');
    }
    if (selectedFilter === 'reel') {
      return items.filter((i) => i.mediaType === 'reel');
    }
    if (selectedFilter === 'story') {
      return items.filter((i) => i.mediaType === 'story');
    }
    if (selectedFilter === 'highlight') {
      return items.filter((i) => i.mediaType === 'highlight');
    }
    return items;
  }, [items, selectedFilter]);

  // Handle select / deselect single item
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all currently visible filtered items
  const handleSelectAll = () => {
    const visibleIds = new Set(filteredItems.map((item) => item.id));
    const allVisibleSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));
    if (allVisibleSelected) {
      setSelectedIds((previous) => new Set([...previous].filter((id) => !visibleIds.has(id))));
    } else {
      setSelectedIds((previous) => new Set([...previous, ...visibleIds]));
    }
  };

  // Trigger batch download
  const handleBatchTrigger = () => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    if (selected.length > 0) {
      onDownloadBatch(selected);
    }
  };

  const isAllSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));

  return (
    <div className="w-full space-y-4 pt-2">
      {/* Filter Tabs & Batch Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 neu-surface rounded-2xl">
        {/* Content Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              selectedFilter === 'all'
                ? 'neu-pill text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('image')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              selectedFilter === 'image'
                ? 'neu-pill text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Photos / Pins ({counts.image})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('reel')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              selectedFilter === 'reel'
                ? 'neu-pill text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Reels / Shorts ({counts.reel})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('video')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              selectedFilter === 'video'
                ? 'neu-pill text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Videos ({counts.video})
          </button>

          {/* Stories Tab */}
          {counts.story > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilter('story')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                selectedFilter === 'story'
                  ? 'neu-pill text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-500" />
              <span>Stories ({counts.story})</span>
            </button>
          )}

          {/* Highlights Tab */}
          {counts.highlight > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilter('highlight')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                selectedFilter === 'highlight'
                  ? 'neu-pill text-fuchsia-600 dark:text-fuchsia-400 ring-1 ring-fuchsia-500/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-3 h-3 text-fuchsia-500" />
              <span>Highlights ({counts.highlight})</span>
            </button>
          )}
        </div>

        {/* Selection & Batch Action Toolbar */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleSelectAll}
            className="neu-pill px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 hover:text-zinc-900 transition cursor-pointer"
          >
            {isAllSelected ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 text-zinc-400" />
                <span>Select All</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={handleBatchTrigger}
            className="neu-blue-btn px-4 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {selectedIds.size > 0
                ? `Download Selected (${selectedIds.size})`
                : 'Download Selected'}
            </span>
          </button>
        </div>
      </div>

      {/* Grid of Media Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 neu-inset rounded-2xl space-y-2">
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            No media found under this filter.
          </p>
          <p className="text-xs text-zinc-400">
            Try switching to another tab or checking another profile.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isDownloading = downloadingItemId === item.id;

            return (
              <div
                key={item.id}
                className={`group relative neu-surface rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 border ${
                  isSelected
                    ? 'border-blue-500/60 ring-2 ring-blue-500/25'
                    : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Media Thumbnail Container */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 neu-inset">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      loading="lazy"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      {item.mediaType === 'image' || item.mediaType === 'pin' ? (
                        <ImageIcon className="w-8 h-8 opacity-40" />
                      ) : (
                        <Film className="w-8 h-8 opacity-40" />
                      )}
                    </div>
                  )}

                  {/* Top Overlay: Select Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition shadow-md cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-blue-500/30'
                          : 'bg-black/60 text-transparent hover:text-white/60 backdrop-blur-xs'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Top Right: External Web Link */}
                  <div className="absolute top-2 right-2 z-10">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-6 h-6 rounded-lg bg-black/60 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-xs transition shadow-md"
                      title="Open Original"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Bottom Overlay: Type & Duration Badge */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    {item.durationFormatted && (
                      <span className="px-1.5 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-mono font-medium backdrop-blur-xs">
                        {item.durationFormatted}
                      </span>
                    )}

                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider backdrop-blur-xs shadow-xs ${
                        item.mediaType === 'story'
                          ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white'
                          : item.mediaType === 'highlight'
                          ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white'
                          : item.mediaType === 'reel'
                          ? 'bg-purple-600/90 text-white'
                          : item.mediaType === 'video'
                          ? 'bg-blue-600/90 text-white'
                          : 'bg-emerald-600/90 text-white'
                      }`}
                    >
                      {item.mediaType}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="pt-2.5 pb-2 space-y-1 flex-1">
                  <h3
                    className="text-xs font-semibold text-zinc-900 dark:text-white line-clamp-2 leading-snug"
                    title={item.title}
                  >
                    {item.title}
                  </h3>

                  {item.uploadDate && (
                    <p className="text-[10px] text-zinc-400 font-medium">
                      {item.uploadDate}
                    </p>
                  )}
                </div>

                {/* Card Action Button */}
                <div className="pt-1 border-t border-zinc-200/50 dark:border-zinc-800/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleSelect(item.id)}
                    className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-blue-600 transition cursor-pointer"
                  >
                    {isSelected ? 'Deselect' : 'Select'}
                  </button>

                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => onDownloadSingle(item)}
                    className="px-3 py-1.5 neu-pill rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:text-blue-700 transition cursor-pointer disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination / Load More Button */}
      {hasMore && (
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            disabled={isLoadingMore}
            onClick={onLoadMore}
            className="neu-pill px-6 py-2.5 rounded-2xl text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:text-blue-600 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading more media...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Load More Content</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
