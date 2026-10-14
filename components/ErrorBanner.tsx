'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div role="alert" className="w-full rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 transition-all">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-red-800 dark:text-red-200 font-medium">
          {message}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
