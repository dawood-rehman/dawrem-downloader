'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { Moon, Sun, Settings } from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
}

export function Navbar({ onOpenSettings }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="w-full flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center space-x-2.5">
        <div className="w-9 h-9 rounded-xl neu-blue-btn flex items-center justify-center text-white shrink-0">
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v12m0 0l-4-4m4 4l4-4" />
            <path d="M4 17a4 4 0 0 0 4 3h8a4 4 0 0 0 4-3" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold tracking-wider text-sm text-zinc-900 dark:text-white leading-none">
            DAWREM
          </span>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
            Downloader
          </span>
        </div>
      </div>

      {/* Right Circular Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="w-9 h-9 rounded-full neu-circle flex items-center justify-center text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-zinc-200" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-700" />
          )}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          className="w-9 h-9 rounded-full neu-circle flex items-center justify-center text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
