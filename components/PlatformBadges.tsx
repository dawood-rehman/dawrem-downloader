'use client';

import React from 'react';
import { SupportedPlatform } from '@/lib/config';

interface PlatformBadgesProps {
  activePlatform?: SupportedPlatform | null;
  onSelectPlatform?: (platform: string) => void;
}

export function PlatformBadges({ activePlatform }: PlatformBadgesProps) {
  return (
    <div className="w-full space-y-5 pt-1">
      {/* 4 Platform Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
        {/* YouTube */}
        <div
          className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold neu-pill cursor-pointer transition-all active:scale-95 ${
            activePlatform === 'youtube'
              ? 'ring-2 ring-red-500/60 scale-105 text-red-600 dark:text-red-400'
              : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <div className="w-4 h-3 bg-red-600 rounded-sm flex items-center justify-center shrink-0">
            <svg className="w-2 h-2 text-white fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span>YouTube</span>
        </div>

        {/* TikTok */}
        <div
          className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold neu-pill cursor-pointer transition-all active:scale-95 ${
            activePlatform === 'tiktok'
              ? 'ring-2 ring-zinc-500/60 scale-105 text-zinc-900 dark:text-white'
              : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <svg className="w-3.5 h-3.5 text-zinc-900 dark:text-white fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.38a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.14 15.66a6.34 6.34 0 0 0 9.4 5.51 6.27 6.27 0 0 0 3.28-5.5V8.92a8.28 8.28 0 0 0 4.84 1.55v-3.48a4.85 4.85 0 0 1-1.07-.3z" />
          </svg>
          <span>TikTok</span>
        </div>

        {/* Instagram */}
        <div
          className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold neu-pill cursor-pointer transition-all active:scale-95 ${
            activePlatform === 'instagram'
              ? 'ring-2 ring-pink-500/60 scale-105 text-pink-600 dark:text-pink-400'
              : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <div className="w-4 h-4 rounded-[4px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center shrink-0">
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </div>
          <span>Instagram</span>
        </div>

        {/* Facebook */}
        <div
          className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold neu-pill cursor-pointer transition-all active:scale-95 ${
            activePlatform === 'facebook'
              ? 'ring-2 ring-blue-500/60 scale-105 text-blue-600 dark:text-blue-400'
              : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#1877f2] flex items-center justify-center shrink-0">
            <svg className="w-2.5 h-2.5 text-white fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <span>Facebook</span>
        </div>
      </div>

      {/* Centered Divider with Text */}
      <div className="relative flex items-center justify-center pt-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-300/60 dark:border-slate-800"></div>
        </div>
        <div className="relative px-3 bg-[#f4f7fb] dark:bg-[#121826]">
          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tracking-wider">
            Supported Platforms
          </span>
        </div>
      </div>
    </div>
  );
}
