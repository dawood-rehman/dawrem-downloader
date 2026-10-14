'use client';

import React, { useEffect, useRef } from 'react';
import { X, ShieldCheck, Cpu, HardDrive, Key, Instagram, Facebook } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  removeWatermarkDefault: boolean;
  setRemoveWatermarkDefault: (val: boolean) => void;
  instagramCookie?: string;
  setInstagramCookie?: (val: string) => void;
  facebookCookie?: string;
  setFacebookCookie?: (val: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  removeWatermarkDefault,
  setRemoveWatermarkDefault,
  instagramCookie = '',
  setInstagramCookie,
  facebookCookie = '',
  setFacebookCookie,
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        ref={dialogRef}
        className="w-full max-w-lg neu-card rounded-3xl p-6 shadow-2xl space-y-5 transition-all max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200/50 dark:border-zinc-800/60">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 id="settings-dialog-title" className="text-base font-bold text-zinc-900 dark:text-white">
              Preferences & Session Credentials
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Watermark toggle */}
          <div className="flex items-start justify-between p-3.5 rounded-2xl neu-surface">
            <div className="space-y-0.5 pr-4">
              <label
                htmlFor="wm-toggle"
                className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white cursor-pointer"
              >
                Watermark Processing (off by default)
              </label>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Only enable this for media you own or have explicit permission to edit. Some platforms prohibit removing creator marks.
              </p>
            </div>
            <input
              id="wm-toggle"
              type="checkbox"
              checked={removeWatermarkDefault}
              onChange={(e) => setRemoveWatermarkDefault(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Instagram Session Cookie */}
          <div className="p-3.5 rounded-2xl neu-surface space-y-2">
            <div className="flex items-center space-x-2">
              <Instagram className="w-4 h-4 text-pink-500" />
              <label htmlFor="instagram-session-cookie" className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                Instagram Session Cookie (sessionid)
              </label>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Optional and sensitive: this cookie may grant access to your account. Use only your own, only when needed. It stays in this page&apos;s memory and is sent with profile requests.
            </p>
            <div className="neu-inset rounded-xl p-1 px-3 flex items-center">
              <Key className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
              <input
                type="password"
                id="instagram-session-cookie"
                value={instagramCookie}
                onChange={(e) => setInstagramCookie?.(e.target.value)}
                placeholder="Paste your Instagram sessionid here..."
                className="w-full py-1 text-xs bg-transparent border-none focus:outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Facebook Session Cookie */}
          <div className="p-3.5 rounded-2xl neu-surface space-y-2">
            <div className="flex items-center space-x-2">
              <Facebook className="w-4 h-4 text-blue-600" />
              <label htmlFor="facebook-session-cookie" className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                Facebook Session Cookie (c_user / xs)
              </label>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Optional and sensitive: this cookie may grant access to your account. Use only your own, only when needed. It stays in this page&apos;s memory and is sent with profile requests.
            </p>
            <div className="neu-inset rounded-xl p-1 px-3 flex items-center">
              <Key className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
              <input
                type="password"
                id="facebook-session-cookie"
                value={facebookCookie}
                onChange={(e) => setFacebookCookie?.(e.target.value)}
                placeholder="c_user=...; xs=... or session cookie string"
                className="w-full py-1 text-xs bg-transparent border-none focus:outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Ephemeral Storage Info */}
          <div className="flex items-start space-x-3 p-3 rounded-2xl neu-surface">
            <HardDrive className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                Ephemeral Temp Storage
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Processed media files are streamed directly to your browser and automatically removed by cleanup routines.
              </p>
            </div>
          </div>

          {/* Speed & Optimization */}
          <div className="flex items-start space-x-3 p-3 rounded-2xl neu-surface">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                High-Speed Pipeline
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Direct stream copying, 10 parallel fragments, and RFC 6266 chunked delivery.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setInstagramCookie?.('');
            setFacebookCookie?.('');
          }}
          className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
        >
          Clear session cookies
        </button>

        {/* Footer */}
        <div className="pt-2 flex justify-end border-t border-zinc-200/50 dark:border-zinc-800/60">
          <button
            onClick={onClose}
            className="px-5 py-2 neu-blue-btn text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Save & Done
          </button>
        </div>
      </div>
    </div>
  );
}
