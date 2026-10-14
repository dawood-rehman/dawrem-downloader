'use client';

import React, { useState } from 'react';
import { UserProfileInfo } from '@/lib/profiles/types';
import {
  CheckCircle2,
  Lock,
  ExternalLink,
  Users,
  Video,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Key,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ProfileHeaderProps {
  profile: UserProfileInfo;
  warning?: string;
  onApplyCookie?: (cookie: string) => void;
}

export function ProfileHeader({
  profile,
  warning,
  onApplyCookie,
}: ProfileHeaderProps) {
  const [showFullBio, setShowFullBio] = useState(false);
  const [inlineCookie, setInlineCookie] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return null;
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const platformColors: Record<string, string> = {
    youtube: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    instagram: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    tiktok: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/20',
    facebook: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    pinterest: 'bg-red-600/10 text-red-600 dark:text-red-400 border-red-600/20',
  };

  const handleApply = () => {
    if (!inlineCookie.trim() || !onApplyCookie) return;
    setIsApplying(true);
    onApplyCookie(inlineCookie.trim());
    setTimeout(() => setIsApplying(false), 800);
  };

  return (
    <div className="w-full neu-surface rounded-2xl p-4 sm:p-6 space-y-4 transition-all">
      {/* Top Profile Summary */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Avatar with circular neumorphic styling */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full neu-circle overflow-hidden p-1 bg-[#e9eef5] dark:bg-[#090d16]">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-full h-full object-cover rounded-full"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-blue-500/15 flex items-center justify-center font-bold text-xl text-blue-600 dark:text-blue-400">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Privacy Indicator Badge */}
          {profile.isPrivate && (
            <span
              title="Private Profile"
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-amber-500 text-white shadow-md ring-2 ring-white dark:ring-zinc-900"
            >
              <Lock className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {/* Info & Handles */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <span>{profile.displayName}</span>
              {/* Blue Tick Verified Badge */}
              {profile.isVerified && (
                <span
                  title="Verified Account (Blue Tick)"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/30 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500 text-white" />
                  <span>Verified</span>
                </span>
              )}
            </h2>

            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
                platformColors[profile.platform] || 'bg-blue-500/10 text-blue-600'
              }`}
            >
              {profile.platform}
            </span>

            <a
              href={profile.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 transition"
              title="Open Original Profile"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            @{profile.username}
          </p>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            {profile.followerCount !== undefined && (
              <div className="neu-pill px-3 py-1 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>{formatNumber(profile.followerCount)} Followers</span>
              </div>
            )}

            {profile.mediaCount !== undefined && (
              <div className="neu-pill px-3 py-1 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-500" />
                <span>{formatNumber(profile.mediaCount)} Items</span>
              </div>
            )}

            {profile.isVerified && (
              <div className="neu-pill px-3 py-1 rounded-full text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Official Badge</span>
              </div>
            )}

            {profile.isPrivate && (
              <div className="neu-pill px-3 py-1 rounded-full text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Private Account</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bio / Description */}
      {profile.bio && (
        <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/60">
          <p
            className={`text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line ${
              !showFullBio ? 'line-clamp-2' : ''
            }`}
          >
            {profile.bio}
          </p>
          {profile.bio.length > 120 && (
            <button
              onClick={() => setShowFullBio(!showFullBio)}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{showFullBio ? 'Show less' : 'Read more'}</span>
              {showFullBio ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      )}

      {/* Warning or Session cookie prompt for private accounts */}
      {(warning || profile.isPrivate) && (
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold">
                {profile.isPrivate
                  ? 'Private / Locked Profile Detected'
                  : 'Authentication Recommended'}
              </p>
              <p className="leading-relaxed opacity-90">
                {warning ||
                  'This account is private or restricts media browsing. Paste your session cookie below to view all uploaded photos, reels, and stories.'}
              </p>
            </div>
          </div>

          {/* In-place Session Cookie Input */}
          <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
            <div className="w-full flex-1 neu-inset rounded-xl px-3 py-1.5 flex items-center bg-white/40 dark:bg-black/20">
              <Key className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
              <input
                type="password"
                value={inlineCookie}
                onChange={(e) => setInlineCookie(e.target.value)}
                placeholder="Paste session cookie (e.g. c_user=...; xs=... or sessionid)"
                className="w-full text-xs bg-transparent border-none focus:outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
              />
            </div>

            <button
              type="button"
              disabled={!inlineCookie.trim() || isApplying}
              onClick={handleApply}
              className="w-full sm:w-auto px-4 py-2 neu-blue-btn text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isApplying ? 'Unlocking...' : 'Unlock & Fetch'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
